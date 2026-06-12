<template>
    <section class="conversation" aria-label="Conversation">
        <header class="conv-header">
            <button class="back-btn" aria-label="Back to conversations" @click="$emit('back')">
                <i class="pi pi-chevron-left"></i>
            </button>

            <div class="avatar" :class="{ online }">
                <img v-if="avatarUrl" :src="avatarUrl" alt="" class="avatar-img" />
                <i v-else class="pi pi-user"></i>
                <span class="presence-dot" :class="{ on: online }"></span>
            </div>

            <div class="who">
                <h2 class="who-name">{{ otherUser?.name }}</h2>
                <span class="who-status">{{ online ? 'Online' : 'Offline' }}</span>
            </div>

            <div class="header-menu">
                <button
                    class="menu-btn"
                    aria-label="Conversation options"
                    :aria-expanded="menuOpen"
                    aria-haspopup="menu"
                    @click="menuOpen = !menuOpen"
                >
                    <i class="pi pi-ellipsis-v"></i>
                </button>

                <button v-if="menuOpen" class="menu-backdrop" aria-hidden="true" tabindex="-1" @click="menuOpen = false"></button>

                <div v-if="menuOpen" class="menu-pop" role="menu">
                    <button class="menu-item danger" role="menuitem" @click="openDeleteConfirm">
                        <i class="pi pi-trash"></i> Delete chat
                    </button>
                </div>
            </div>
        </header>

        <div v-if="connectionState !== 'connected'" class="conn-banner" role="status" aria-live="polite">
            <i class="pi pi-sync" :class="{ 'pi-spin': connectionState === 'reconnecting' }"></i>
            <span v-if="connectionState === 'reconnecting'">Reconnecting…</span>
            <span v-else-if="connectionState === 'disconnected'">You're offline. Messages will send when you reconnect.</span>
            <span v-else>Connecting…</span>
        </div>

        <div ref="scrollEl" class="message-scroll" @scroll="onScroll">
          <div class="scroll-inner">
            <div v-if="thread?.loading && !thread.items.length" class="state">
                <i class="pi pi-spin pi-spinner"></i>
                <span>Loading messages…</span>
            </div>

            <div v-else-if="thread?.error" class="state error" role="alert">
                <i class="pi pi-exclamation-circle"></i>
                <span>{{ thread.error }}</span>
                <button class="retry" @click="store.loadMessages(conversationId)">Retry</button>
            </div>

            <template v-else>
                <button
                    v-if="thread?.hasMore"
                    class="load-older"
                    :disabled="thread.loading"
                    @click="store.loadOlder(conversationId)"
                >
                    {{ thread.loading ? 'Loading…' : 'Load earlier messages' }}
                </button>

                <div v-if="!segments.length" class="state subtle">
                    <span>No messages yet</span>
                </div>

                <template v-for="seg in segments" :key="seg.key">
                    <!-- Messages before any order share no header -->
                    <template v-if="!seg.order">
                        <MessageBubble
                            v-for="m in seg.messages"
                            :key="m.id"
                            :message="m"
                            :mine="m.sender.id === myId"
                        />
                    </template>

                    <!-- One collapsible order segment -->
                    <div v-else class="order-block">
                        <button
                            class="order-divider"
                            :aria-expanded="!isCollapsed(seg.order)"
                            @click="toggle(seg.order.id)"
                        >
                            <i class="pi" :class="isCollapsed(seg.order) ? 'pi-chevron-right' : 'pi-chevron-down'"></i>
                            <span class="od-label">Order #{{ seg.order.id }}</span>
                            <span class="od-line"></span>
                            <span class="od-hint">{{ segHint(seg) }}</span>
                        </button>

                        <template v-if="!isCollapsed(seg.order)">
                            <div class="order-card">
                                <div class="order-main">
                                    <p class="order-item">{{ seg.order.item }}</p>
                                    <span class="order-sub"><template v-if="seg.order.stall">{{ seg.order.stall }} · </template>#{{ seg.order.id }}</span>
                                </div>
                                <button class="view-order-btn" @click="openOrder(seg.order)">Details</button>
                            </div>

                            <button v-if="canComplete(seg.order)" class="order-action complete" :disabled="acting" @click="doComplete(seg.order)">
                                {{ acting ? 'Completing…' : 'Complete order' }}
                            </button>
                            <button v-else-if="canPickup(seg.order)" class="order-action pickup" :disabled="acting" @click="doPickup(seg.order)">
                                {{ acting ? 'Saving…' : 'Mark picked up' }}
                            </button>
                            <div v-else-if="showPickedChip(seg.order)" class="picked-chip">
                                <i class="pi pi-check"></i> Picked up
                            </div>

                            <div v-if="seg.order.acceptedAt" class="sys-event">
                                {{ acceptedBy(seg.order) }} accepted this order · {{ clock(seg.order.acceptedAt) }}
                            </div>

                            <MessageBubble
                                v-for="m in seg.messages"
                                :key="m.id"
                                :message="m"
                                :mine="m.sender.id === myId"
                            />

                            <div v-if="seg.order.status === 'completed'" class="sys-event">
                                Order completed<template v-if="seg.order.deliveredAt"> · {{ clock(seg.order.deliveredAt) }}</template><template v-if="pointsText(seg.order)"> · {{ pointsText(seg.order) }}</template>
                            </div>

                            <div v-else-if="seg.order.status === 'cancelled'" class="sys-event">
                                Order cancelled
                            </div>
                        </template>
                    </div>
                </template>
            </template>

            <div v-if="someoneTyping" class="typing" aria-live="polite">
                <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        </div>

        <MessageComposer :conversation-id="conversationId" :disabled="connectionState === 'disconnected'" />

        <OrderDetailsSheet
            v-if="selectedOrder"
            :visible="showOrder"
            :order="selectedOrder"
            :buyer-name="sheetBuyerName"
            :runner-name="sheetRunnerName"
            @close="showOrder = false"
        />

        <Transition name="confirm-fade">
            <div v-if="confirmDelete" class="confirm-overlay" @click.self="confirmDelete = false">
                <div class="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="del-title">
                    <h3 id="del-title" class="confirm-title">Delete this chat?</h3>
                    <p class="confirm-text">
                        It's removed from your messages only. It'll come back if {{ otherUser?.name }}
                        messages you or you order together again.
                    </p>
                    <div class="confirm-actions">
                        <button class="confirm-cancel" :disabled="deleting" @click="confirmDelete = false">Cancel</button>
                        <button class="confirm-delete" :disabled="deleting" @click="doDelete">
                            {{ deleting ? 'Deleting…' : 'Delete' }}
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </section>
</template>

<script setup>
import { computed, ref, reactive, watch, nextTick, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useMessagesStore } from '../../stores/messages';
import { useAuthStore } from '../../stores/auth';
import { resolveFileUrl } from '../../utils/fileUrl';
import MessageBubble from './MessageBubble.vue';
import MessageComposer from './MessageComposer.vue';
import OrderDetailsSheet from './OrderDetailsSheet.vue';

defineEmits(['back']);

const store = useMessagesStore();
const auth = useAuthStore();
const toast = useToast();

const conversationId = computed(() => store.activeConversationId);
const conversation = computed(() => store.activeConversation);
const thread = computed(() => store.activeThread);
const otherUser = computed(() => conversation.value?.otherUser);
const myId = computed(() => auth.user?.id ?? null);
const myName = computed(() => auth.user?.username || 'You');
const connectionState = computed(() => store.connectionState);

const avatarUrl = computed(() => resolveFileUrl(otherUser.value?.pfpUrl));
const online = computed(() => (otherUser.value ? store.isUserOnline(otherUser.value.id) : false));
const someoneTyping = computed(() => store.typingUsers(conversationId.value).length > 0);

// ---- orders timeline ------------------------------------------------------
const orders = computed(() => thread.value?.orders || []);

const showOrder = ref(false);
const selectedOrder = ref(null);
const acting = ref(false);
const menuOpen = ref(false);
const confirmDelete = ref(false);
const deleting = ref(false);

const toMs = (iso) => {
    const t = new Date(iso).getTime();
    return Number.isNaN(t) ? 0 : t;
};

const orderStart = (o) => toMs(o.acceptedAt || o.createdAt);

// Group messages under the order that was active when they were sent, so each
// order is a self-contained, collapsible segment. Messages sent before any
// order share a header-less leading segment.
const segments = computed(() => {
    const msgs = thread.value?.items || [];
    const ords = [...orders.value].sort((a, b) => orderStart(a) - orderStart(b));

    const lead = { key: 'lead', order: null, messages: [] };
    const segs = ords.map((o) => ({ key: `seg${o.id}`, order: o, messages: [] }));

    for (const m of msgs) {
        const t = toMs(m.createdAt);
        let idx = -1;
        for (let i = 0; i < ords.length; i += 1) {
            if (orderStart(ords[i]) <= t) idx = i;
            else break;
        }
        if (idx === -1) lead.messages.push(m);
        else segs[idx].messages.push(m);
    }

    return lead.messages.length ? [lead, ...segs] : segs;
});

// ---- collapse state -------------------------------------------------------
const collapsed = reactive({}); // orderId -> bool
const isCollapsed = (o) => !!collapsed[o.id];
const toggle = (orderId) => {
    collapsed[orderId] = !collapsed[orderId];
};

// Default: the latest order and any still-active order are expanded; older,
// finished orders start collapsed. User toggles are preserved across refreshes.
watch(
    orders,
    (list) => {
        const sorted = [...list].sort((a, b) => orderStart(a) - orderStart(b));
        const latestId = sorted[sorted.length - 1]?.id;
        for (const o of sorted) {
            if (collapsed[o.id] === undefined) {
                collapsed[o.id] = !(o.id === latestId || o.status === 'accepted');
            }
        }
    },
    { immediate: true }
);

function segHint(seg) {
    const o = seg.order;
    const status =
        o.status === 'completed'
            ? 'Completed'
            : o.status === 'cancelled'
              ? 'Cancelled'
              : o.status === 'accepted'
                ? 'Active'
                : '';
    const n = seg.messages.length;
    const msgs = n ? `${n} message${n > 1 ? 's' : ''}` : '';
    return [status, msgs].filter(Boolean).join(' · ');
}

const canComplete = (o) => o.status === 'accepted' && o.viewerRole === 'Buyer';
const canPickup = (o) => o.status === 'accepted' && o.viewerRole === 'Runner' && !o.collectedAt;
const showPickedChip = (o) => o.status === 'accepted' && o.viewerRole === 'Runner' && !!o.collectedAt;

// The deliverer accepts the order; the buyer marks it completed.
const acceptedBy = (o) => (o.viewerRole === 'Runner' ? 'You' : otherUser.value?.name);
const pointsText = (o) => (o.status === 'completed' && o.viewerRole === 'Runner' ? '+1 point' : null);

const sheetBuyerName = computed(() => {
    const o = selectedOrder.value;
    if (!o) return '';
    return Number(o.requesterId) === Number(myId.value) ? myName.value : otherUser.value?.name || '';
});
const sheetRunnerName = computed(() => {
    const o = selectedOrder.value;
    if (!o) return '';
    if (Number(o.delivererId) === Number(myId.value)) return myName.value;
    return o.delivererId ? otherUser.value?.name || '' : '';
});

function openOrder(o) {
    selectedOrder.value = o;
    showOrder.value = true;
}

function openDeleteConfirm() {
    menuOpen.value = false;
    confirmDelete.value = true;
}

async function doDelete() {
    if (deleting.value) return;
    deleting.value = true;
    try {
        // The store clears the active conversation, which returns the user to
        // the list on mobile and the placeholder on desktop.
        await store.deleteConversation(conversationId.value);
        confirmDelete.value = false;
    } catch (e) {
        store.lastError = e.message;
    } finally {
        deleting.value = false;
    }
}

async function doComplete(order) {
    if (acting.value) return;
    acting.value = true;
    try {
        await store.completeOrder(conversationId.value, order?.id);
        toast.add({ severity: 'success', summary: 'Order completed', life: 2500 });
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Could not complete order', detail: e.message, life: 4000 });
    } finally {
        acting.value = false;
    }
}

async function doPickup(order) {
    if (acting.value) return;
    acting.value = true;
    try {
        await store.markPickedUp(conversationId.value, order?.id);
        toast.add({ severity: 'success', summary: 'Marked as picked up', life: 2500 });
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Could not update order', detail: e.message, life: 4000 });
    } finally {
        acting.value = false;
    }
}

function clock(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s/g, '').toLowerCase();
}

// ---- scroll handling ------------------------------------------------------
const scrollEl = ref(null);
let pinnedToBottom = true;

function isAtBottom() {
    const el = scrollEl.value;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
}

function onScroll() {
    pinnedToBottom = isAtBottom();
}

function scrollToBottom() {
    nextTick(() => {
        const el = scrollEl.value;
        if (el) el.scrollTop = el.scrollHeight;
    });
}

watch(
    () => thread.value?.items.length,
    (next, prev) => {
        if (next > (prev || 0) && pinnedToBottom) scrollToBottom();
    }
);

watch(conversationId, () => {
    pinnedToBottom = true;
    showOrder.value = false;
    selectedOrder.value = null;
    menuOpen.value = false;
    confirmDelete.value = false;
    Object.keys(collapsed).forEach((k) => delete collapsed[k]); // fresh defaults
    scrollToBottom();
});

// Re-anchor to bottom when orders load/change height.
watch(orders, () => {
    if (pinnedToBottom) scrollToBottom();
});

onMounted(scrollToBottom);
</script>

<style scoped>
.conversation {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--bg-main);
}

.conv-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-color);
}

.back-btn {
    display: none;
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-main);
    font-size: 1.1rem;
    cursor: pointer;
    border-radius: 50%;
}

.back-btn:focus-visible {
    outline: 2px solid var(--theme-blue);
    outline-offset: 2px;
}

.avatar {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 1rem;
    flex-shrink: 0;
}

.avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.presence-dot {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--text-subtle);
    border: 2px solid var(--bg-surface);
}

.presence-dot.on {
    background: var(--color-success);
}

.who {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    flex: 1;
    min-width: 0;
}

.who-name {
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.98rem;
    font-weight: 700;
    color: var(--text-main);
}

.who-status {
    font-size: 0.74rem;
    color: var(--text-muted);
}

/* Header overflow menu */
.header-menu {
    position: relative;
    flex-shrink: 0;
}

.menu-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.05rem;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.menu-btn:hover {
    background: var(--bg-input);
    color: var(--text-main);
}

.menu-btn:focus-visible {
    outline: 2px solid var(--theme-blue);
    outline-offset: 2px;
}

.menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    border: none;
    background: transparent;
    cursor: default;
}

.menu-pop {
    position: absolute;
    top: 46px;
    right: 0;
    z-index: 50;
    min-width: 168px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 6px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: none;
    background: transparent;
    color: var(--text-main);
    font-size: 0.88rem;
    font-weight: 600;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
}

.menu-item:hover {
    background: var(--bg-input);
}

.menu-item.danger {
    color: var(--color-error);
}

.menu-item:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

/* Delete confirmation */
.confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 1200;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.confirm-box {
    width: 100%;
    max-width: 340px;
    background: var(--bg-surface);
    border-radius: 20px;
    padding: 22px;
    text-align: center;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.confirm-title {
    margin: 0 0 8px;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-main);
}

.confirm-text {
    margin: 0 0 18px;
    color: var(--text-muted);
    font-size: 0.86rem;
    line-height: 1.45;
}

.confirm-actions {
    display: flex;
    gap: 10px;
}

.confirm-cancel,
.confirm-delete {
    flex: 1;
    border: none;
    border-radius: 14px;
    padding: 12px;
    font-weight: 800;
    font-size: 0.9rem;
    cursor: pointer;
}

.confirm-cancel {
    background: var(--bg-input);
    color: var(--text-main);
}

.confirm-delete {
    background: var(--color-error);
    color: #fff;
}

.confirm-cancel:disabled,
.confirm-delete:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.confirm-cancel:focus-visible,
.confirm-delete:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.3);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
    transition: opacity 0.18s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
    opacity: 0;
}

.conn-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 0.78rem;
    background: var(--info-card);
    color: var(--text-muted);
    border-bottom: 1px solid var(--border-color);
}

.message-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

/* Bubbles flush to the pane edges (sender right, receiver left). The order and
   status cards cap their own width so they stay tidy on wide panes. */
.scroll-inner {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 16px;
}

/* Order card */
.order-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 14px 0;
}

/* Clickable divider that toggles an order segment open/closed */
.order-divider {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    margin: 8px 0 2px;
    padding: 4px 2px;
    color: var(--text-muted);
    font-size: 0.74rem;
    font-weight: 700;
    border-radius: 8px;
    transition: color 0.12s ease;
}

.order-divider:hover {
    color: var(--text-main);
}

.order-divider:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.order-divider i {
    font-size: 0.7rem;
    color: var(--text-subtle);
}

.od-label {
    flex-shrink: 0;
    font-weight: 600;
}

.od-line {
    flex: 1;
    height: 1px;
    background: var(--divider-color);
}

.od-hint {
    flex-shrink: 0;
    color: var(--text-subtle);
    font-weight: 600;
}

.order-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 12px 14px;
}

.order-main {
    flex: 1;
    min-width: 0;
}

.order-item {
    margin: 0 0 2px;
    color: var(--text-main);
    font-size: 0.92rem;
    font-weight: 700;
    line-height: 1.3;
    overflow-wrap: anywhere;
}

.order-sub {
    color: var(--text-muted);
    font-size: 0.78rem;
}

.view-order-btn {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: var(--theme-blue);
    padding: 8px 10px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    white-space: nowrap;
}

.view-order-btn:hover {
    background: var(--bg-input);
}

.view-order-btn:focus-visible,
.order-action:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.order-action {
    width: 100%;
    border: none;
    border-radius: 14px;
    padding: 12px 16px;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    color: #fff;
}

.order-action.complete {
    background: var(--color-success);
}

.order-action.pickup {
    background: var(--theme-blue);
}

.order-action:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.picked-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--color-success);
    font-size: 0.78rem;
    font-weight: 700;
    padding: 4px 2px;
}

/* System events */
.sys-event {
    text-align: center;
    color: var(--text-subtle);
    font-size: 0.76rem;
    margin: 10px 0;
}

.state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: auto;
    color: var(--text-muted);
    font-size: 0.9rem;
    text-align: center;
}

.state i {
    font-size: 1.6rem;
}

.state.error {
    color: var(--color-error);
}

.state.subtle {
    color: var(--text-subtle);
}

.retry {
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-main);
    border-radius: 18px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 0.82rem;
}

.load-older {
    align-self: center;
    margin-bottom: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-muted);
    border-radius: 18px;
    padding: 6px 16px;
    cursor: pointer;
    font-size: 0.8rem;
}

.load-older:focus-visible,
.retry:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.typing {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 9px 13px;
    margin-top: 4px;
    align-self: flex-start;
    background: var(--bubble-bg);
    border-radius: 18px 18px 18px 6px;
}

.typing .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-subtle);
    animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing .dot:nth-child(2) {
    animation-delay: 0.15s;
}

.typing .dot:nth-child(3) {
    animation-delay: 0.3s;
}

@keyframes typing-bounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
    30% { transform: translateY(-4px); opacity: 1; }
}

@media (max-width: 760px) {
    .back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}
</style>
