<template>
    <div class="app-screen">
        <div class="view-toggle-wrapper">
            <div class="segmented-control">
                <button class="segment-btn" :class="{ active: viewMode === 'map' }" @click="viewMode = 'map'">
                    Map
                </button>
                <button class="segment-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
                    List
                </button>
            </div>
        </div>

        <div class="bell-wrapper">
            <NotificationBell />
        </div>

        <EnableNotificationsBanner />

        <div class="content-area">
            <MapView v-if="viewMode === 'map'" :requests="requests" :my-request="myRequest" :accepting-id="acceptingId"
                :online-user-ids="onlineUserIds" :current-user-id="authStore.user?.id"
                @select-request="openRequestDrawer" @map-click="closeRequestDrawer" />
            <ListView v-else :requests="requests" :my-request="myRequest" :loading="loading" :error="error"
                :accepting-id="acceptingId" :online-user-ids="onlineUserIds" @accept-request="acceptRequest" />
        </div>

        <button v-if="!loading && !myRequest" class="request-btn" @click="router.push('/request')">
            <span class="request-icon">+</span>
            <span>Request</span>
        </button>

        <DeliveryRequestDrawer :visible="drawerVisible" :request="drawerRequest" :active="!!myRequest"
            :accepting="Boolean(drawerRequest && acceptingId === drawerRequest.id)" :cancelling="cancelling"
            :completing="completing" :runner-online="runnerOnline" @accept="acceptRequest" @cancel="handleDrawerCancel"
            @complete="completeOrder" @collected="markCollected" @chat="openChat" />

        <BottomNav />

    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import MapView from './MapView.vue';
import ListView from './ListView.vue';
import BottomNav from '../components/BottomNav.vue';
import DeliveryRequestDrawer from '../components/DeliveryRequestDrawer.vue';
import NotificationBell from '../components/NotificationBell.vue';
import EnableNotificationsBanner from '../components/EnableNotificationsBanner.vue';

import { useToast } from 'primevue/usetoast';
const toast = useToast();

import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';
import { useMessagesStore } from '../stores/messages';

const router = useRouter();
const authStore = useAuthStore();
const requestStore = useRequestStore();
const messagesStore = useMessagesStore();

const viewMode = ref('map');

const requests = ref([]);
const myRequest = ref(null);
const loading = ref(true);
const error = ref(null);
const acceptingId = ref(null);
const onlineUserIds = ref(new Set());

async function loadRequests() {
    try {
        loading.value = true;
        error.value = null;
        const [{ requests: data }, { request: active }] = await Promise.all([
            apiRequest.get('/requests'),
            apiRequest.get('/requests/active'),
        ]);
        requests.value = data;
        myRequest.value = active;
        requestStore.setActiveRequest(active);
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
}

async function acceptRequest(id) {
    if (acceptingId.value) return;
    acceptingId.value = id;
    try {
        const { request } = await apiRequest.patch(`/requests/${id}/accept`, {});
        requests.value = requests.value.filter((r) => r.id !== id);
        selectedMapRequest.value = null;
        myRequest.value = request;
        requestStore.setActiveRequest(request);
    } catch (e) {
        error.value = e.message;
        loadRequests();
    } finally {
        acceptingId.value = null;
    }
}

// Socket.IO Integration
const socket = getSocket();
const currentUserId = computed(() => authStore.user?.id ?? authStore.user?.userId);

function joinOrderRoom(request) {
    if (!request?.id) return;

    socket.emit('request:join', {
        requestId: request.id
    });
}

function isCurrentUser(userId) {
    return Number(userId) === Number(currentUserId.value);
}

function onCreated(request) {
    const myId = authStore.user?.id;
    if (request.requester.id === myId) return;
    if (!requests.value.some((r) => r.id === request.id)) {
        requests.value.unshift(request);
    }
}

function onAccepted({ id }) {
    requests.value = requests.value.filter((r) => r.id !== id);
}

function onActiveRequest(request) {
    selectedMapRequest.value = null;
    myRequest.value = request;
    requestStore.setActiveRequest(request);
}

function onCancelled({ id, reason, cancelledBy }) {
    requests.value = requests.value.filter((r) => r.id !== id);

    if (selectedMapRequest.value?.id === id) {
        selectedMapRequest.value = null;
    }

    if (myRequest.value?.id === id) {
        const cancelledByMe = isCurrentUser(cancelledBy);

        clearActiveOrder()

        if (!cancelledByMe) {
            toast.add({
                severity: 'info',
                summary: 'Order cancelled',
                detail: reason || 'The other user cancelled the order.',
            });
        }
    }
}

function onCompleted({ id }) {
    if (selectedMapRequest.value?.id === id) {
        selectedMapRequest.value = null;
    }

    if (myRequest.value?.id === id) {
        const wasDeliverer = isCurrentUser(myRequest.value.deliverer?.id);

        clearActiveOrder()

        if (wasDeliverer) {
            authStore.adjustPoints?.(1);
            authStore.incrementDeliveries();

            toast.add({
                severity: 'success',
                summary: 'Order completed',
                detail: 'The order has been marked as completed.',
            });
        }
    }

    requests.value = requests.value.filter((r) => r.id !== id);
}

function onCollected({ id, request }) {
    if (myRequest.value?.id !== id) return;

    myRequest.value = request;
    requestStore.setActiveRequest(request);

    const isRequester = isCurrentUser(request.requester?.id);

    if (isRequester && request.status !== 'completed') {
        toast.add({
            severity: 'success',
            summary: 'Order collected',
            detail: 'The Runner has collected the order.',
        });
    }
}

// Online Status
function onPresenceSnapshot({ onlineUserIds: ids = [] }) {
    onlineUserIds.value = new Set(ids.map(Number));
}

function onPresenceUpdate({ userId, online }) {
    const next = new Set(onlineUserIds.value);
    const id = Number(userId);
    if (online) {
        next.add(id);
    } else {
        next.delete(id);
    }
    onlineUserIds.value = next;
}

const runnerOnline = computed(() => {
    const delivererId = drawerRequest.value?.deliverer?.id;
    if (!delivererId) return false;

    return onlineUserIds.value.has(Number(delivererId));
});

// Actions
const completing = ref(false);

async function completeOrder(request) {
    if (!request || completing.value) return;

    completing.value = true;
    error.value = null;

    try {
        const { points } = await apiRequest.patch(`/requests/${request.id}/complete`, {});

        authStore.setPoints(points);

        clearActiveOrder()

        toast.add({
            severity: 'success',
            summary: 'Order completed',
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        completing.value = false;
    }
}

async function markCollected(request) {
    if (!request || completing.value) return;

    completing.value = true;
    error.value = null;

    try {
        const { request: updatedRequest } = await apiRequest.patch(`/requests/${request.id}/collected`, {});

        myRequest.value = updatedRequest;
        requestStore.setActiveRequest(updatedRequest);

        toast.add({
            severity: 'success',
            summary: 'Collected Order',
            detail: 'The Runner has collected the order.',
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        completing.value = false;
    }
}

// Drawer Stuff
const selectedMapRequest = ref(null);

const drawerRequest = computed(() => {
    return myRequest.value || selectedMapRequest.value;
});

const drawerVisible = computed(() => {
    return Boolean(drawerRequest.value);
});

function openRequestDrawer(request) {
    selectedMapRequest.value = request;
}

function closeRequestDrawer() {
    if (myRequest.value) return;

    selectedMapRequest.value = null;
}

watch(
    () => myRequest.value?.id,
    () => {
        joinOrderRoom(myRequest.value);
    }
);

watch(myRequest, (request) => {
    if (request) {
        selectedMapRequest.value = null;
    }
});

const cancelling = ref(false);

function clearActiveOrder() {
    myRequest.value = null;
    requestStore.clearActiveRequest();
    selectedMapRequest.value = null;
}

async function handleDrawerCancel(payload) {
    if (!payload?.request || cancelling.value) return;

    const request = payload.request;
    const hadPenalty = request.status === 'accepted';

    cancelling.value = true;
    error.value = null;

    try {
        const { points } = await apiRequest.patch(`/requests/${request.id}/cancel`, {
            reason: hadPenalty ? payload.reason : null,
        });

        if (hadPenalty) {
            authStore.setPoints(points);
        }

        requests.value = requests.value.filter((r) => r.id !== request.id);
        clearActiveOrder()

        toast.add({
            severity: 'info',
            summary: 'Order cancelled',
            detail: payload.reason || 'You cancelled the order.',
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        cancelling.value = false;
    }
}

const openingChat = ref(false);

async function openChat(request) {
    if (!request || openingChat.value) return;

    // The other participant is whoever I am not on this order.
    const iAmRequester = isCurrentUser(request.requester?.id);
    const other = iAmRequester ? request.deliverer : request.requester;
    if (!other?.id) {
        toast.add({ severity: 'info', summary: 'Chat unavailable', detail: 'Waiting for a runner to accept this order.', life: 3000 });
        return;
    }

    openingChat.value = true;
    try {
        const conversation = await messagesStore.startConversation(other.id, request.id);
        await router.push('/messages');
        messagesStore.openConversation(conversation.id);
    } catch (e) {
        toast.add({ severity: 'error', summary: 'Could not open chat', detail: e.message, life: 4000 });
    } finally {
        openingChat.value = false;
    }
}

onMounted(() => {
    loadRequests();
    socket.on('connect', loadRequests);
    socket.on('request:created', onCreated);
    socket.on('request:accepted', onAccepted);
    socket.on('request:active', onActiveRequest);
    socket.on('request:cancelled', onCancelled);
    socket.on('request:collected', onCollected);
    socket.on('request:completed', onCompleted);
    socket.on('presence:snapshot', onPresenceSnapshot);
    socket.on('presence:update', onPresenceUpdate);
    socket.emit('presence:subscribe');
});

onUnmounted(() => {
    socket.off('connect', loadRequests);
    socket.off('request:created', onCreated);
    socket.off('request:accepted', onAccepted);
    socket.off('request:active', onActiveRequest);
    socket.off('request:cancelled', onCancelled);
    socket.off('request:collected', onCollected);
    socket.off('request:completed', onCompleted);
    socket.off('presence:snapshot', onPresenceSnapshot);
    socket.off('presence:update', onPresenceUpdate);
});
</script>

<style scoped>
.app-screen {
    position: relative;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
}

.view-toggle-wrapper {
    position: absolute;
    top: 24px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
}

.bell-wrapper {
    position: absolute;
    top: 22px;
    right: 16px;
    z-index: 1001;
    pointer-events: none;
}

/*
    Map and List View Switch
    White text on blue background (Inactive state)
*/
.segmented-control {
    background-color: var(--color-primary);
    padding: 4px;
    border-radius: 30px;
    display: flex;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
}

.segment-btn {
    background: transparent;
    border: none;
    color: #ffffff;
    padding: 8px 24px;
    border-radius: 26px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

/*
    Map and List View Buttons
    Blue text on white background (Active state)
*/

.segment-btn.active {
    background-color: #ffffff;
    color: var(--color-primary);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.content-area {
    height: 100%;
    width: 100%;
}

.request-btn {
    position: fixed;
    bottom: 90px;
    right: 20px;
    background-color: var(--color-accent);
    box-shadow: 0 8px 22px rgba(239, 124, 0, 0.45);
    color: white;
    border: none;
    border-radius: 30px;
    padding: 13px 24px;
    font-size: 1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.request-btn:active {
    transform: scale(0.95);
}

.request-icon {
    font-size: 1.4rem;
    line-height: 1;
}
</style>