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

        <div class="content-area">
            <MapView v-if="viewMode === 'map'" :requests="requests" :my-request="myRequest" :accepting-id="acceptingId"
                :online-user-ids="onlineUserIds" @accept-request="acceptRequest" />
            <ListView v-else :requests="requests" :my-request="myRequest" :loading="loading" :error="error"
                :accepting-id="acceptingId" :online-user-ids="onlineUserIds" @accept-request="acceptRequest" />
        </div>

        <button v-if="!loading && !myRequest" class="request-btn" @click="router.push('/request')">
            <span class="request-icon">+</span>
            <span>Request</span>
        </button>

        <BottomNav />

    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

import MapView from '../components/MapView.vue';
import ListView from '../components/ListView.vue';
import BottomNav from '../components/BottomNav.vue';

import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';

const router = useRouter();
const auth = useAuthStore();
const requestStore = useRequestStore();

const viewMode = ref('list');

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
        if (active) {
            router.replace('/request');
        }
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
        myRequest.value = request;
        requestStore.setActiveRequest(request);
        router.replace('/request');
    } catch (e) {
        error.value = e.message;
        loadRequests();
    } finally {
        acceptingId.value = null;
    }
}

// Socket.IO Integration
const socket = getSocket();

function onCreated(request) {
    const myId = auth.user?.id ?? auth.user?.userId;
    if (request.requester.id === myId) return;
    if (!requests.value.some((r) => r.id === request.id)) {
        requests.value.unshift(request);
    }
}

function onAccepted({ id }) {
    requests.value = requests.value.filter((r) => r.id !== id);
}

function onActiveRequest(request) {
    myRequest.value = request;
    requestStore.setActiveRequest(request);
    router.replace('/request');
}

function onCancelled({ id }) {
    requests.value = requests.value.filter((r) => r.id !== id);
    if (myRequest.value?.id === id) {
        myRequest.value = null;
        requestStore.clearActiveRequest();
    }
}

function onCompleted({ id }) {
    requests.value = requests.value.filter((r) => r.id !== id);
    if (myRequest.value?.id === id) {
        myRequest.value = null;
        requestStore.clearActiveRequest();
    }
}

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

onMounted(() => {
    loadRequests();
    socket.on('connect', loadRequests);
    socket.on('request:created', onCreated);
    socket.on('request:accepted', onAccepted);
    socket.on('request:active', onActiveRequest);
    socket.on('request:cancelled', onCancelled);
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