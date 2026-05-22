<template>
    <div class="list-view-container">

        <!-- Sub-tabs -->
        <div class="list-header">
            <div class="sub-tabs">
                <button
                    v-for="tab in tabs"
                    :key="tab.key"
                    class="sub-tab"
                    :class="{ active: activeTab === tab.key }"
                    @click="activeTab = tab.key"
                >
                    <span class="tab-label">{{ tab.label }}</span>
                    <span v-if="tab.badge != null" class="tab-badge">{{ tab.badge }}</span>
                </button>
            </div>
        </div>

        <!-- Cards -->
        <div class="cards-scroll-area">
            <p v-if="loading" class="list-state">Loading requests…</p>
            <p v-else-if="error" class="list-state error">{{ error }}</p>

            <div v-else-if="filteredRequests.length === 0" class="empty-state">
                <div class="empty-icon">
                    <i class="pi pi-inbox"></i>
                </div>
                <h3 class="empty-title">Nothing available yet!</h3>
                <p class="empty-sub">Check again later — new requests pop up here in real time.</p>
            </div>

            <DeliveryRequestCard
                v-for="request in filteredRequests"
                :key="request.id"
                :request="request"
                :requester-online="onlineUserIds.has(Number(request.requester.id))"
                :accepting="acceptingId === request.id"
                :is-own="!!myRequest"
                @accept="acceptRequest"
            />
            <div class="bottom-spacer"></div>
        </div>

    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import DeliveryRequestCard from './DeliveryRequestCard.vue';
import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';

const auth = useAuthStore();
const requestStore = useRequestStore();

const activeTab = ref('nearby');
const requests = ref([]);
const myRequest = ref(null);
const loading = ref(true);
const error = ref(null);
const acceptingId = ref(null);
const onlineUserIds = ref(new Set());

const filteredRequests = computed(() =>
    myRequest.value ? [myRequest.value] : requests.value
);

const tabs = computed(() => {
    const count = filteredRequests.value.length || null;
    return [
        { key: 'nearby',     label: 'Nearby Me',  badge: count },
        { key: 'recent',     label: 'Recent',     badge: count },
        { key: 'next-class', label: 'Next Class', badge: null },
    ];
});

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
        await apiRequest.patch(`/requests/${id}/accept`, {});
        requests.value = requests.value.filter((r) => r.id !== id);
    } catch (e) {
        error.value = e.message;
        loadRequests();
    } finally {
        acceptingId.value = null;
    }
}

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
.list-view-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    background: var(--bg-card);
}

/* ── Sub-tabs header ─────────────────────────── */
.list-header {
    padding: 80px 20px 0;
    flex-shrink: 0;
}

.sub-tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
}

.sub-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 10px 16px;
    margin-bottom: -1px;
    cursor: pointer;
    color: var(--text-muted);
    font-size: 0.875rem;
    font-weight: 500;
    white-space: nowrap;
    transition: color 0.15s ease, border-color 0.15s ease;
}

.sub-tab.active {
    color: var(--text-main);
    border-bottom-color: var(--color-accent);
    font-weight: 700;
}

.tab-badge {
    background: var(--color-accent);
    color: #ffffff;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    line-height: 1.6;
}

/* ── Scrollable card area ────────────────────── */
.cards-scroll-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 0;
}

.bottom-spacer {
    height: 120px;
}

.list-state {
    text-align: center;
    color: var(--text-muted);
    font-size: 0.875rem;
    padding: 24px 0;
}

.list-state.error {
    color: var(--color-error);
}

/* ── Empty state ─────────────────────────────── */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 64px 24px;
}

.empty-icon {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: linear-gradient(145deg, rgba(239, 124, 0, 0.18), rgba(239, 124, 0, 0.06));
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    animation: float 3s ease-in-out infinite;
}

.empty-icon .pi {
    font-size: 2.4rem;
    color: var(--color-accent);
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-8px); }
}

.empty-title {
    margin: 0 0 6px;
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text-main);
}

.empty-sub {
    margin: 0;
    max-width: 260px;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--text-muted);
}
</style>
