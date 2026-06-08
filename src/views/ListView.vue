<template>
    <div class="list-view-container">

        <!-- Sub-tabs -->
        <div class="list-header">
            <div class="sub-tabs">
                <button v-for="tab in tabs" :key="tab.key" class="sub-tab" :class="{ active: activeTab === tab.key }"
                    @click="activeTab = tab.key">
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
                <p class="empty-sub">Check again later! New requests pop up here in real time.</p>
            </div>

            <DeliveryRequestCard v-for="request in filteredRequests" :key="request.id" :request="request"
                :requester-online="onlineUserIds.has(Number(request.requester.id))"
                :accepting="acceptingId === request.id" :is-own="!!myRequest"
                @accept="$emit('accept-request', $event)" />
            <div class="bottom-spacer"></div>
        </div>

    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DeliveryRequestCard from '../components/DeliveryRequestCard.vue';

const props = defineProps({
    requests: { type: Array, required: true },
    myRequest: { type: Object, default: null },
    loading: { type: Boolean, required: true },
    error: { type: String, default: null },
    acceptingId: { type: [Number, String], default: null },
    onlineUserIds: { type: Object, required: true } // Expects a SET
});

defineEmits(['accept-request']);

const activeTab = ref('nearby');

const filteredRequests = computed(() =>
    props.myRequest ? [props.myRequest] : props.requests
);

const tabs = computed(() => {
    const count = filteredRequests.value.length || null;
    return [
        { key: 'nearby', label: 'Nearby Me', badge: count },
        { key: 'recent', label: 'Recent', badge: count },
        { key: 'next-class', label: 'Next Class', badge: null },
    ];
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

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-8px);
    }
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
