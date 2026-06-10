import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from './auth';

const TYPING_TIMEOUT = 4000;

export const useMessagesStore = defineStore('messages', () => {
    const auth = useAuthStore();

    const conversations = ref([]);
    const conversationsLoading = ref(false);
    const conversationsError = ref(null);

    const activeConversationId = ref(null);
    // { [conversationId]: { items, loading, error, hasMore } }
    const threads = reactive({});

    const onlineUserIds = ref(new Set());
    const typingByConversation = reactive({}); // { [id]: Set<userId> }
    const typingTimers = new Map();

    const connectionState = ref('connecting'); // connecting | connected | reconnecting | disconnected
    const lastError = ref(null);

    let socket = null;
    let bound = false;

    const myId = () => auth.user?.id ?? null;

    const totalUnread = computed(() =>
        conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
    );

    const isUserOnline = (userId) => onlineUserIds.value.has(Number(userId));

    const activeThread = computed(() =>
        activeConversationId.value ? threads[activeConversationId.value] : null
    );

    const activeConversation = computed(() =>
        conversations.value.find((c) => c.id === activeConversationId.value) || null
    );

    function ensureThread(id) {
        if (!threads[id]) {
            threads[id] = { items: [], loading: false, error: null, hasMore: false, orders: [] };
        }
        if (!threads[id].orders) threads[id].orders = [];
        return threads[id];
    }

    function upsertConversation(partial) {
        const idx = conversations.value.findIndex((c) => c.id === partial.id);
        if (idx === -1) {
            conversations.value = [partial, ...conversations.value];
        } else {
            conversations.value[idx] = { ...conversations.value[idx], ...partial };
        }
    }

    function bumpConversationToTop(id) {
        const idx = conversations.value.findIndex((c) => c.id === id);
        if (idx > 0) {
            const [item] = conversations.value.splice(idx, 1);
            conversations.value.unshift(item);
        }
    }

    // ---- socket event handlers -------------------------------------------

    function onConnect() {
        connectionState.value = 'connected';
        loadConversations();
        // Re-join and re-sync the open conversation after a reconnect so no
        // messages are missed while disconnected.
        if (activeConversationId.value) {
            joinAndSync(activeConversationId.value);
        }
        socket.emit('presence:subscribe');
    }

    function onDisconnect() {
        connectionState.value = 'disconnected';
    }

    function onReconnectAttempt() {
        connectionState.value = 'reconnecting';
    }

    function onPresenceSnapshot({ onlineUserIds: ids }) {
        onlineUserIds.value = new Set((ids || []).map(Number));
    }

    function onPresenceUpdate({ userId, online }) {
        const next = new Set(onlineUserIds.value);
        if (online) next.add(Number(userId));
        else next.delete(Number(userId));
        onlineUserIds.value = next;
    }

    function onMessageNew(message) {
        const convId = message.conversationId;
        const thread = threads[convId];
        if (thread && !thread.items.some((m) => m.id === message.id)) {
            thread.items.push(message);
        }
        // If the conversation is open, immediately mark it read.
        if (convId === activeConversationId.value && message.sender.id !== myId()) {
            markRead(convId, message.id);
        }
    }

    function onInbox({ conversationId, message }) {
        const existing = conversations.value.find((c) => c.id === conversationId);
        if (!existing) {
            // Unknown conversation (e.g. someone messaged us first) — refresh.
            loadConversations();
            return;
        }

        const incrementUnread =
            message.sender.id !== myId() && conversationId !== activeConversationId.value;

        upsertConversation({
            id: conversationId,
            lastMessage: {
                id: message.id,
                body: message.body,
                senderId: message.sender.id,
                createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
            unreadCount: incrementUnread ? (existing.unreadCount || 0) + 1 : existing.unreadCount,
        });
        bumpConversationToTop(conversationId);
    }

    function onTyping({ conversationId, userId }) {
        if (!typingByConversation[conversationId]) typingByConversation[conversationId] = new Set();
        typingByConversation[conversationId].add(Number(userId));
        const key = `${conversationId}:${userId}`;
        clearTimeout(typingTimers.get(key));
        typingTimers.set(
            key,
            setTimeout(() => onStopTyping({ conversationId, userId }), TYPING_TIMEOUT)
        );
    }

    function onStopTyping({ conversationId, userId }) {
        typingByConversation[conversationId]?.delete(Number(userId));
    }

    function onError({ error }) {
        lastError.value = error || 'Something went wrong.';
    }

    // Another tab/device of ours deleted a conversation — mirror it locally.
    function onConversationCleared({ conversationId }) {
        removeConversationLocally(conversationId);
    }

    // A linked order changed status (or a new order between the pair started)
    // somewhere in the app — refresh the open conversation's timeline plus any
    // conversation that references the order.
    function onOrderEvent(payload) {
        const orderId = payload?.id;
        if (!orderId) return;
        const ids = new Set();
        if (activeConversationId.value) ids.add(activeConversationId.value);
        conversations.value.forEach((c) => {
            if (c.order && c.order.id === orderId) ids.add(c.id);
        });
        ids.forEach((id) => {
            refreshConversation(id);
            if (threads[id]) loadOrders(id);
        });
    }

    // ---- lifecycle --------------------------------------------------------

    function init() {
        if (bound) return;
        socket = getSocket();
        bound = true;

        connectionState.value = socket.connected ? 'connected' : 'connecting';

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.io.on('reconnect_attempt', onReconnectAttempt);
        socket.on('presence:snapshot', onPresenceSnapshot);
        socket.on('presence:update', onPresenceUpdate);
        socket.on('messages:new', onMessageNew);
        socket.on('messages:inbox', onInbox);
        socket.on('messages:typing', onTyping);
        socket.on('messages:stopTyping', onStopTyping);
        socket.on('messages:error', onError);
        socket.on('messages:conversationCleared', onConversationCleared);
        // Keep the linked-order status fresh when the order changes elsewhere.
        socket.on('request:accepted', onOrderEvent);
        socket.on('request:completed', onOrderEvent);
        socket.on('request:collected', onOrderEvent);
        socket.on('request:cancelled', onOrderEvent);
        socket.emit('presence:subscribe');

        loadConversations();
    }

    function teardown() {
        if (!bound || !socket) return;
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.io.off('reconnect_attempt', onReconnectAttempt);
        socket.off('presence:snapshot', onPresenceSnapshot);
        socket.off('presence:update', onPresenceUpdate);
        socket.off('messages:new', onMessageNew);
        socket.off('messages:inbox', onInbox);
        socket.off('messages:typing', onTyping);
        socket.off('messages:stopTyping', onStopTyping);
        socket.off('messages:error', onError);
        socket.off('messages:conversationCleared', onConversationCleared);
        socket.off('request:accepted', onOrderEvent);
        socket.off('request:completed', onOrderEvent);
        socket.off('request:collected', onOrderEvent);
        socket.off('request:cancelled', onOrderEvent);
        typingTimers.forEach((t) => clearTimeout(t));
        typingTimers.clear();
        bound = false;
        socket = null;
    }

    // Clear all state (called on logout).
    function reset() {
        teardown();
        conversations.value = [];
        activeConversationId.value = null;
        Object.keys(threads).forEach((k) => delete threads[k]);
        Object.keys(typingByConversation).forEach((k) => delete typingByConversation[k]);
        onlineUserIds.value = new Set();
        conversationsError.value = null;
        lastError.value = null;
    }

    // ---- data actions -----------------------------------------------------

    async function loadConversations() {
        conversationsLoading.value = true;
        conversationsError.value = null;
        try {
            const { conversations: list } = await apiRequest.get('/messages/conversations');
            conversations.value = list || [];
        } catch (err) {
            conversationsError.value = err.message || 'Failed to load conversations.';
        } finally {
            conversationsLoading.value = false;
        }
    }

    async function loadMessages(conversationId, { before = null } = {}) {
        const thread = ensureThread(conversationId);
        thread.loading = true;
        thread.error = null;
        try {
            const params = before ? `?before=${before}` : '';
            const { messages, hasMore } = await apiRequest.get(
                `/messages/conversations/${conversationId}/messages${params}`
            );
            if (before) {
                thread.items = [...messages, ...thread.items];
            } else {
                thread.items = messages;
            }
            thread.hasMore = hasMore;
        } catch (err) {
            thread.error = err.message || 'Failed to load messages.';
        } finally {
            thread.loading = false;
        }
    }

    async function loadOlder(conversationId) {
        const thread = threads[conversationId];
        if (!thread || !thread.hasMore || thread.loading) return;
        const oldest = thread.items[0]?.id;
        if (oldest) await loadMessages(conversationId, { before: oldest });
    }

    // Load every order shared by the two participants so the timeline can show
    // repeat orders as separate, divided segments.
    async function loadOrders(conversationId) {
        const thread = ensureThread(conversationId);
        try {
            const { orders } = await apiRequest.get(`/messages/conversations/${conversationId}/orders`);
            thread.orders = orders || [];
        } catch {
            thread.orders = thread.orders || [];
        }
    }

    function joinAndSync(conversationId) {
        if (!socket) return;
        socket.emit('messages:joinConversation', { conversationId }, (res) => {
            if (res?.ok) loadMessages(conversationId);
        });
    }

    async function openConversation(conversationId) {
        const previous = activeConversationId.value;
        if (previous && previous !== conversationId && socket) {
            socket.emit('messages:leaveConversation', { conversationId: previous });
        }
        activeConversationId.value = conversationId;
        ensureThread(conversationId);

        joinAndSync(conversationId);
        loadOrders(conversationId);
        await loadMessages(conversationId);
        markRead(conversationId);
    }

    function closeConversation() {
        if (activeConversationId.value && socket) {
            socket.emit('messages:leaveConversation', { conversationId: activeConversationId.value });
        }
        activeConversationId.value = null;
    }

    // Sends via socket ack so we only confirm once the server has persisted the
    // message (server-generated id). The message is appended through the
    // messages:new broadcast, deduped by id — no optimistic duplicate.
    function sendMessage(conversationId, body) {
        return new Promise((resolve, reject) => {
            if (!socket) return reject(new Error('Not connected.'));
            const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            socket.emit('messages:send', { conversationId, body, clientId }, (res) => {
                if (res?.ok) resolve(res.message);
                else reject(new Error(res?.error || 'Failed to send message.'));
            });
        });
    }

    function markRead(conversationId, messageId = undefined) {
        const convo = conversations.value.find((c) => c.id === conversationId);
        if (convo) upsertConversation({ id: conversationId, unreadCount: 0 });
        if (socket) socket.emit('messages:read', { conversationId, messageId });
    }

    function sendTyping(conversationId) {
        socket?.emit('messages:typing', { conversationId });
    }

    function sendStopTyping(conversationId) {
        socket?.emit('messages:stopTyping', { conversationId });
    }

    // Re-fetch a single conversation (e.g. after its linked order changes).
    async function refreshConversation(conversationId) {
        try {
            const { conversation } = await apiRequest.get(`/messages/conversations/${conversationId}`);
            if (conversation) upsertConversation(conversation);
        } catch {
            // Non-fatal; the next list refresh will reconcile.
        }
    }

    // Upload an image (optionally with a caption). The message arrives back via
    // the messages:new broadcast and is appended/deduped by id.
    async function sendImage(conversationId, file, caption = '') {
        const form = new FormData();
        form.append('image', file);
        if (caption?.trim()) form.append('body', caption.trim());
        const { message } = await apiRequest.postFormData(
            `/messages/conversations/${conversationId}/images`,
            form
        );
        return message;
    }

    // Buyer completes a specific order from within the chat. The orderId comes
    // from the order segment the button belongs to (falling back to the linked
    // order) so the right order is always acted on.
    async function completeOrder(conversationId, orderId) {
        const convo = conversations.value.find((c) => c.id === conversationId);
        const id = orderId ?? convo?.order?.id;
        if (!id) throw new Error('No order linked to this conversation.');
        const { request } = await apiRequest.patch(`/requests/${id}/complete`, {});
        applyOrderUpdate(conversationId, request ? { id, ...request } : { id });
        return request;
    }

    // Runner marks a specific order as picked up from within the chat.
    async function markPickedUp(conversationId, orderId) {
        const convo = conversations.value.find((c) => c.id === conversationId);
        const id = orderId ?? convo?.order?.id;
        if (!id) throw new Error('No order linked to this conversation.');
        const { request } = await apiRequest.patch(`/requests/${id}/collected`, {});
        applyOrderUpdate(conversationId, request ? { id, ...request } : { id });
        return request;
    }

    function applyOrderUpdate(conversationId, request) {
        if (!request) return;
        const convo = conversations.value.find((c) => c.id === conversationId);
        if (convo?.order && (!request.id || request.id === convo.order.id)) {
            upsertConversation({
                id: conversationId,
                order: {
                    ...convo.order,
                    status: request.status,
                    acceptedAt: request.acceptedAt ?? convo.order.acceptedAt,
                    collectedAt: request.collectedAt ?? convo.order.collectedAt,
                    deliveredAt: request.deliveredAt ?? convo.order.deliveredAt,
                },
            });
        }
        // Update the matching segment in the timeline too.
        const thread = threads[conversationId];
        if (thread?.orders?.length) {
            const targetId = request.id ?? convo?.order?.id;
            thread.orders = thread.orders.map((o) =>
                o.id === targetId
                    ? {
                          ...o,
                          status: request.status,
                          acceptedAt: request.acceptedAt ?? o.acceptedAt,
                          collectedAt: request.collectedAt ?? o.collectedAt,
                          deliveredAt: request.deliveredAt ?? o.deliveredAt,
                      }
                    : o
            );
        }
    }

    function removeConversationLocally(conversationId) {
        conversations.value = conversations.value.filter((c) => c.id !== conversationId);
        delete threads[conversationId];
        if (activeConversationId.value === conversationId) {
            if (socket) socket.emit('messages:leaveConversation', { conversationId });
            activeConversationId.value = null;
        }
    }

    // Soft-delete a conversation for the current user (hides it; the other
    // person keeps their copy, and it returns if they message/order again).
    async function deleteConversation(conversationId) {
        await apiRequest.delete(`/messages/conversations/${conversationId}`);
        removeConversationLocally(conversationId);
    }

    // Find-or-create a direct conversation with another user (e.g. from an order).
    async function startConversation(userId, requestId = undefined) {
        const { conversation } = await apiRequest.post('/messages/conversations', {
            userId,
            ...(requestId ? { requestId } : {}),
        });
        upsertConversation(conversation);
        return conversation;
    }

    function typingUsers(conversationId) {
        const set = typingByConversation[conversationId];
        if (!set) return [];
        return [...set].filter((id) => id !== myId());
    }

    return {
        conversations,
        conversationsLoading,
        conversationsError,
        activeConversationId,
        activeConversation,
        activeThread,
        threads,
        connectionState,
        lastError,
        totalUnread,
        isUserOnline,
        init,
        teardown,
        reset,
        loadConversations,
        loadMessages,
        loadOlder,
        openConversation,
        closeConversation,
        sendMessage,
        sendImage,
        markRead,
        sendTyping,
        sendStopTyping,
        startConversation,
        refreshConversation,
        deleteConversation,
        completeOrder,
        markPickedUp,
        typingUsers,
    };
});
