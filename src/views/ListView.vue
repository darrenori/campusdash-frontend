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

        <!-- Next class banner -->
        <div v-if="showNextClassBanner" class="next-class-banner">
            <i class="pi pi-map-marker banner-pin"></i>
            <div class="banner-text">
                <span class="banner-label">Orders on your way to</span>
                <span class="banner-venue">{{ nextClass.venue || nextClass.venueCode }}</span>
            </div>
            <span class="banner-meta">{{ nextClass.moduleCode }}</span>
        </div>

        <!-- Cards -->
        <div class="cards-scroll-area">
            <p v-if="loading" class="list-state">Loading requests…</p>
            <p v-else-if="error" class="list-state error">{{ error }}</p>

            <div v-else-if="activeTab === 'next-class' && !nextClass && !myRequest" class="empty-state">
                <div class="empty-icon">
                    <i class="pi pi-calendar"></i>
                </div>
                <h3 class="empty-title">No timetable yet</h3>
                <p class="empty-sub">Add your NUSMods timetable in your Profile to see orders heading your way.</p>
            </div>

            <div v-else-if="displayedRequests.length === 0" class="empty-state">
                <div class="empty-icon">
                    <i class="pi pi-inbox"></i>
                </div>
                <h3 class="empty-title">Nothing available yet!</h3>
                <p class="empty-sub">Check again later! New requests pop up here in real time.</p>
            </div>

            <DeliveryRequestCard v-for="request in displayedRequests" :key="request.id" :request="request"
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
import { useAuthStore } from '../stores/auth';
import { timetableLessons, computeNextLocation, distanceMeters } from '../utils/timetable';

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
const authStore = useAuthStore();

//where the runner's headed next, from their saved timetable
const nextClass = computed(() => {
    const lessons = timetableLessons(authStore.user);
    return lessons ? computeNextLocation(lessons) : null;
});

const baseRequests = computed(() =>
    props.myRequest ? [props.myRequest] : props.requests
);

//sort orders by how close the drop-off is to the next class, so the ones on
//the way show first. falls back to normal order if we've got no coords for it.
const nextClassRequests = computed(() => {
    const target = nextClass.value?.coords;
    if (!target) return baseRequests.value;

    return [...baseRequests.value].sort(
        (a, b) => distanceMeters(a.deliveryCoords, target) - distanceMeters(b.deliveryCoords, target)
    );
});

const displayedRequests = computed(() => {
    if (props.myRequest) return baseRequests.value;
    return activeTab.value === 'next-class' ? nextClassRequests.value : baseRequests.value;
});

const showNextClassBanner = computed(() =>
    activeTab.value === 'next-class' && !!nextClass.value && !props.myRequest && !props.loading
);

const tabs = computed(() => {
    const count = baseRequests.value.length || null;
    return [
        { key: 'nearby', label: 'Nearby Me', badge: count },
        { key: 'recent', label: 'Recent (WIP)', badge: count },
        { key: 'next-class', label: 'Next Class', badge: nextClass.value ? count : null },
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

/* ── Next class banner ───────────────────────── */
.next-class-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 14px 20px 0;
    padding: 12px 16px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    flex-shrink: 0;
}

.banner-pin {
    font-size: 1.05rem;
    color: var(--color-accent);
    flex-shrink: 0;
}

.banner-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.banner-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-muted);
}

.banner-venue {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--theme-blue);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.banner-meta {
    margin-left: auto;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted);
    flex-shrink: 0;
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
