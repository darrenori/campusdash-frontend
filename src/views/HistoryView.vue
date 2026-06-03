<template>
    <div class="history-page">

        <!-- Orange header with wave -->
        <header class="hist-header">
            <div class="hist-brand">
                <img src="../assets/logos/logo-square.svg" alt="" class="hist-logo" />
                <div class="hist-title-stack">
                    <span>MY</span>
                    <span>ORDERS</span>
                </div>
            </div>

            <div v-if="!loading && !error" class="hist-chips">
                <div v-if="activeCount > 0" class="hist-chip live">
                    <span class="chip-live-dot"></span>
                    {{ activeCount }} active
                </div>
                <div class="hist-chip">{{ completedCount }} completed</div>
            </div>

            <svg class="header-wave" viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,26 C150,2 330,60 500,34 L500,70 L0,70 Z" class="wave-fill" />
            </svg>
        </header>

        <!-- Filter -->
        <div class="filter-wrap">
            <div class="seg-control">
                <button
                    v-for="f in filters"
                    :key="f.value"
                    class="seg-btn"
                    :class="{ active: activeFilter === f.value }"
                    @click="activeFilter = f.value"
                >{{ f.label }}</button>
            </div>
        </div>

        <!-- Skeleton -->
        <div v-if="loading" class="skeleton-wrap">
            <div class="skel-active"></div>
            <div class="skel-date-row"><div class="skel-date-line"></div></div>
            <div class="skel-past"></div>
            <div class="skel-past short"></div>
            <div class="skel-past"></div>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="center-state">
            <div class="state-icon error"><i class="pi pi-exclamation-circle"></i></div>
            <p class="state-title">Couldn't load orders</p>
            <p class="state-sub">{{ error }}</p>
            <button class="retry-btn" @click="loadHistory">Retry</button>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredOrders.length === 0" class="center-state">
            <div class="state-icon"><i class="pi pi-inbox"></i></div>
            <p class="state-title">No orders yet</p>
            <p class="state-sub">{{ emptyMessage }}</p>
        </div>

        <!-- Orders -->
        <div v-else class="orders-content">

            <!-- ── Active orders ─────────────────────── -->
            <template v-if="activeOrders.length > 0">
                <div class="section-row">
                    <span class="section-live-dot"></span>
                    <span class="section-title">Active now</span>
                </div>

                <div
                    v-for="order in activeOrders"
                    :key="order.id"
                    class="active-card"
                    :class="order.status"
                    @click="$router.push('/request')"
                >
                    <div class="ac-top">
                        <div class="ac-badge">
                            <span class="ac-pulse-dot"></span>
                            {{ order.status === 'open' ? 'Finding runner…' : 'In progress' }}
                        </div>
                        <span class="ac-role-tag">
                            {{ isRequester(order) ? 'You ordered' : 'You\'re running' }}
                        </span>
                    </div>

                    <p class="ac-item">{{ order.item }}</p>

                    <div class="ac-route-box">
                        <div class="ac-route-row">
                            <span class="ar-dot pickup"></span>
                            <span class="ar-label">{{ order.stall }}, {{ order.canteen }}</span>
                        </div>
                        <div class="ar-connector"><span class="ar-dashes"></span></div>
                        <div class="ac-route-row">
                            <span class="ar-dot dropoff"></span>
                            <span class="ar-label dest">{{ order.deliveryLocation }}</span>
                        </div>
                    </div>

                    <div class="ac-footer">
                        <span class="ac-person">
                            <i :class="isRequester(order) ? 'pi pi-send' : 'pi pi-user'"></i>
                            <template v-if="isRequester(order)">
                                {{ order.deliverer?.name ?? 'Waiting for runner…' }}
                            </template>
                            <template v-else>{{ order.requester.name }}</template>
                        </span>
                        <span class="ac-track-cta">Track <i class="pi pi-angle-right"></i></span>
                    </div>
                </div>
            </template>

            <!-- ── Past orders ──────────────────────── -->
            <template v-if="pastOrders.length > 0">
                <div v-for="group in groupedPastOrders" :key="group.date" class="date-group">
                    <div class="date-row">
                        <span class="date-label">{{ group.date }}</span>
                        <span class="date-line"></span>
                    </div>

                    <div
                        v-for="order in group.orders"
                        :key="order.id"
                        class="past-card"
                        :class="[order.status, isRequester(order) ? 'is-req' : 'is-run']"
                    >
                        <div class="pc-icon-strip">
                            <div class="pc-icon-circle">
                                <i :class="order.status === 'completed' ? 'pi pi-check' : 'pi pi-times'"></i>
                            </div>
                        </div>
                        <div class="pc-body">
                        <div class="pc-top-row">
                            <span class="pc-stall-tag">
                                <i class="pi pi-shop"></i>
                                {{ order.stall }}
                            </span>
                            <span class="pc-status-badge" :class="order.status">
                                <i :class="order.status === 'completed' ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
                                {{ order.status === 'completed' ? 'Completed' : 'Cancelled' }}
                            </span>
                        </div>

                        <p class="pc-item">{{ order.item }}</p>

                        <div class="pc-route">
                            <span class="pc-canteen">{{ order.canteen }}</span>
                            <span class="pc-chevron"><i class="pi pi-arrow-right"></i></span>
                            <span class="pc-dest">{{ order.deliveryLocation }}</span>
                        </div>

                        <div v-if="order.specialRequest" class="pc-special">
                            <i class="pi pi-comment"></i>
                            {{ order.specialRequest }}
                        </div>

                        <div class="pc-footer">
                            <span class="pc-role-pill" :class="isRequester(order) ? 'req' : 'run'">
                                <i :class="isRequester(order) ? 'pi pi-user' : 'pi pi-send'"></i>
                                {{ isRequester(order) ? 'Requester' : 'Runner' }}
                            </span>
                            <span class="pc-meta">
                                <span class="pc-person">
                                    {{ isRequester(order) ? (order.deliverer?.name ?? '—') : order.requester.name }}
                                </span>
                                <span class="pc-sep">·</span>
                                <span class="pc-time">{{ formatTime(order.createdAt) }}</span>
                            </span>
                        </div>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Show more -->
            <button v-if="hasMorePast" class="show-more-btn" @click="showMore">
                Show {{ Math.min(remainingCount, 15) }} more
            </button>

            <div class="bottom-spacer"></div>
        </div>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { apiRequest } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import BottomNav from '../components/BottomNav.vue';

const authStore = useAuthStore();
const orders = ref([]);
const loading = ref(true);
const error = ref(null);
const activeFilter = ref('all');

const filters = [
    { label: 'All', value: 'all' },
    { label: 'Requester', value: 'requester' },
    { label: 'Runner', value: 'runner' },
];

const isRequester = (order) => order.requester.id === authStore.user?.id;

const filteredOrders = computed(() => {
    if (activeFilter.value === 'requester') return orders.value.filter(isRequester);
    if (activeFilter.value === 'runner') return orders.value.filter((o) => !isRequester(o));
    return orders.value;
});

const activeOrders = computed(() =>
    filteredOrders.value.filter((o) => o.status === 'open' || o.status === 'accepted')
);
const pastOrders = computed(() =>
    filteredOrders.value.filter((o) => o.status === 'completed' || o.status === 'cancelled')
);
const activeCount = computed(() => activeOrders.value.length);
const completedCount = computed(() => pastOrders.value.filter((o) => o.status === 'completed').length);

const emptyMessage = computed(() => {
    if (activeFilter.value === 'requester') return "Orders you've placed will appear here.";
    if (activeFilter.value === 'runner') return "Deliveries you've completed will appear here.";
    return "Your past orders will show up here.";
});

const PAST_PAGE = 3;
const pastLimit = ref(PAST_PAGE);

const visiblePastOrders = computed(() => pastOrders.value.slice(0, pastLimit.value));
const hasMorePast = computed(() => pastOrders.value.length > pastLimit.value);
const remainingCount = computed(() => pastOrders.value.length - pastLimit.value);

function showMore() {
    pastLimit.value += PAST_PAGE;
}

const groupedPastOrders = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const groups = new Map();
    for (const order of visiblePastOrders.value) {
        const d = new Date(order.createdAt);
        const day = new Date(d);
        day.setHours(0, 0, 0, 0);
        let label;
        if (day.getTime() === today.getTime()) label = 'Today';
        else if (day.getTime() === yesterday.getTime()) label = 'Yesterday';
        else label = d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(order);
    }
    return [...groups.entries()].map(([date, items]) => ({ date, orders: items }));
});

function formatTime(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' });
}

async function loadHistory() {
    loading.value = true;
    error.value = null;
    try {
        const { requests } = await apiRequest.get('/requests/history');
        orders.value = requests;
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
}

onMounted(loadHistory);
</script>

<style scoped>
.history-page {
    height: 100dvh;
    width: 100vw;
    background: var(--bg-main);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
}

/* ═══════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════ */
.hist-header {
    position: relative;
    background: var(--color-accent);
    padding: 38px 24px 62px;
    flex-shrink: 0;
}

.hist-brand {
    display: flex;
    align-items: center;
    gap: 14px;
}

.hist-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    filter: brightness(0) invert(1);
}

.hist-title-stack {
    display: flex;
    flex-direction: column;
    line-height: 0.86;
    font-size: 2rem;
    font-style: italic;
    font-weight: 900;
    letter-spacing: -0.01em;
    color: #ffffff;
}

.hist-chips {
    display: flex;
    gap: 8px;
    margin-top: 16px;
}

.hist-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 700;
    padding: 5px 13px;
    border-radius: 20px;
    backdrop-filter: blur(4px);
}

.hist-chip.live {
    background: rgba(255, 255, 255, 0.95);
    color: var(--color-accent);
}

.chip-live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-accent);
    animation: chipPulse 1.2s ease-in-out infinite;
}

@keyframes chipPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.45; transform: scale(0.65); }
}

.header-wave {
    position: absolute;
    left: 0;
    bottom: -1px;
    width: 100%;
    height: 56px;
}

.wave-fill { fill: var(--bg-main); }

/* ═══════════════════════════════════════════
   FILTER
   ═══════════════════════════════════════════ */
.filter-wrap {
    display: flex;
    justify-content: center;
    padding: 20px 16px 4px;
    flex-shrink: 0;
}

.seg-control {
    display: inline-flex;
    background: var(--bg-surface);
    border-radius: 12px;
    padding: 3px;
    border: 1px solid var(--border-color);
    gap: 2px;
}

.seg-btn {
    padding: 9px 22px;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    white-space: nowrap;
}

.seg-btn.active {
    background: var(--color-primary);
    color: #ffffff;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(0, 61, 124, 0.28);
}

/* ═══════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════ */
.skeleton-wrap {
    padding: 16px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.skel-active {
    height: 178px;
    border-radius: 22px;
    background: linear-gradient(90deg,
        rgba(239,124,0,0.12) 25%,
        rgba(239,124,0,0.22) 50%,
        rgba(239,124,0,0.12) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
}

.skel-date-row {
    padding: 8px 4px 0;
}

.skel-date-line {
    height: 10px;
    width: 72px;
    border-radius: 6px;
    background: var(--bg-surface);
    animation: shimmer 1.4s infinite;
}

.skel-past {
    height: 140px;
    border-radius: 18px;
    background: linear-gradient(90deg,
        var(--bg-surface) 25%,
        var(--bg-input) 50%,
        var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite 0.1s;
}

.skel-past.short { height: 110px; animation-delay: 0.2s; }

@keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

/* ═══════════════════════════════════════════
   CENTER STATES
   ═══════════════════════════════════════════ */
.center-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 32px;
}

.state-icon {
    width: 76px;
    height: 76px;
    border-radius: 50%;
    background: rgba(239, 124, 0, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    font-size: 2rem;
    color: var(--color-accent);
    animation: float 3s ease-in-out infinite;
}

.state-icon.error {
    background: rgba(211, 58, 44, 0.08);
    color: var(--color-danger);
    animation: none;
}

@keyframes float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-8px); }
}

.state-title {
    margin: 0 0 6px;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.01em;
}

.state-sub {
    margin: 0 0 24px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
    max-width: 240px;
    line-height: 1.5;
}

.retry-btn {
    padding: 11px 28px;
    border: none;
    border-radius: 14px;
    background: var(--color-accent);
    color: #ffffff;
    font-size: 0.88rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 6px 16px rgba(239, 124, 0, 0.3);
}

.retry-btn:active { transform: scale(0.96); }

/* ═══════════════════════════════════════════
   CONTENT SHELL
   ═══════════════════════════════════════════ */
.orders-content {
    padding: 8px 14px 0;
}

/* ── Section header ─────────────────────────── */
.section-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 2px 12px;
}

.section-live-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(239, 124, 0, 0.18);
    animation: liveDot 1.3s ease-in-out infinite;
    flex-shrink: 0;
}

@keyframes liveDot {
    0%, 100% { box-shadow: 0 0 0 0   rgba(239, 124, 0, 0.4); }
    50%       { box-shadow: 0 0 0 6px rgba(239, 124, 0, 0);   }
}

.section-title {
    font-size: 0.92rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.01em;
}

/* ═══════════════════════════════════════════
   ACTIVE CARD  (gradient, full colour)
   ═══════════════════════════════════════════ */
.active-card {
    border-radius: 22px;
    padding: 18px 18px 16px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.18s ease;
    border: none;
}

.active-card:active {
    transform: scale(0.97);
}

.active-card.open {
    background: linear-gradient(145deg, #EF7C00 0%, #d96a00 100%);
    box-shadow: 0 10px 32px rgba(239, 124, 0, 0.38),
                0 2px 8px rgba(239, 124, 0, 0.2);
}

.active-card.accepted {
    background: linear-gradient(145deg, #003D7C 0%, #1455a4 100%);
    box-shadow: 0 10px 32px rgba(0, 61, 124, 0.36),
                0 2px 8px rgba(0, 61, 124, 0.18);
}

/* Top row */
.ac-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.ac-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 5px 11px;
    border-radius: 10px;
    letter-spacing: 0.02em;
    backdrop-filter: blur(4px);
}

.ac-pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #ffffff;
    flex-shrink: 0;
    animation: acPulse 1.1s ease-in-out infinite;
}

@keyframes acPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.6); }
}

.ac-role-tag {
    font-size: 0.7rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.7);
}

/* Item name */
.ac-item {
    margin: 0;
    font-size: 1.22rem;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.02em;
    line-height: 1.2;
    word-break: break-word;
}

/* Route box */
.ac-route-box {
    background: rgba(255, 255, 255, 0.14);
    border-radius: 14px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 0;
    backdrop-filter: blur(4px);
}

.ac-route-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.ar-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
}

.ar-dot.pickup {
    background: rgba(255, 255, 255, 0.55);
    border: 1.5px solid rgba(255, 255, 255, 0.4);
}

.ar-dot.dropoff {
    background: #ffffff;
}

.ar-connector {
    display: flex;
    align-items: center;
    padding: 3px 0 3px 4px;
}

.ar-dashes {
    display: block;
    width: 2px;
    height: 18px;
    background: repeating-linear-gradient(
        to bottom,
        rgba(255,255,255,0.45) 0px,
        rgba(255,255,255,0.45) 4px,
        transparent 4px,
        transparent 8px
    );
    border-radius: 2px;
}

.ar-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
    line-height: 1.2;
}

.ar-label.dest {
    font-size: 0.9rem;
    font-weight: 800;
    color: #ffffff;
}

/* Footer */
.ac-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.ac-person {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.85);
}

.ac-person .pi {
    font-size: 0.76rem;
}

.ac-track-cta {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: 0.02em;
}

/* ═══════════════════════════════════════════
   DATE SEPARATOR
   ═══════════════════════════════════════════ */
.date-group { margin-bottom: 4px; }

.date-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 2px 10px;
}

.date-label {
    font-size: 0.74rem;
    font-weight: 800;
    color: var(--text-muted);
    white-space: nowrap;
    letter-spacing: 0.02em;
}

.date-line {
    flex: 1;
    height: 1px;
    background: var(--divider-color);
}

/* ═══════════════════════════════════════════
   PAST CARD
   ═══════════════════════════════════════════ */
.past-card {
    background: var(--bg-card);
    border-radius: 20px;
    margin-bottom: 10px;
    border: 1px solid var(--border-color);
    box-shadow: 0 1px 3px rgba(16, 24, 40, 0.04),
                0 4px 14px rgba(16, 24, 40, 0.05);
    display: flex;
    flex-direction: row;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
    overflow: hidden;
}

.pc-icon-strip {
    width: 52px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px 0 0 20px;
}

.pc-icon-circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
}

.past-card.completed .pc-icon-strip {
    background: rgba(14, 159, 110, 0.08);
}

.past-card.completed .pc-icon-circle {
    background: rgba(14, 159, 110, 0.15);
    color: var(--color-success);
}

.past-card.cancelled .pc-icon-strip {
    background: rgba(211, 58, 44, 0.06);
}

.past-card.cancelled .pc-icon-circle {
    background: rgba(211, 58, 44, 0.12);
    color: var(--color-danger);
}

.pc-body {
    flex: 1;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}


.past-card:active { transform: scale(0.985); }
.past-card.cancelled { opacity: 0.75; }

/* Top row */
.pc-top-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
}

.pc-stall-tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-subtle);
}

.pc-stall-tag .pi {
    font-size: 0.68rem;
}

.pc-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 3px 9px;
    border-radius: 8px;
}

.pc-status-badge.completed {
    background: rgba(14, 159, 110, 0.1);
    color: var(--color-success);
}

.pc-status-badge.cancelled {
    background: rgba(211, 58, 44, 0.08);
    color: var(--color-danger);
}

/* Item name */
.pc-item {
    margin: 0;
    font-size: 1.04rem;
    font-weight: 800;
    color: var(--text-main);
    letter-spacing: -0.02em;
    line-height: 1.3;
    word-break: break-word;
}

/* Route row */
.pc-route {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    overflow: hidden;
}

.pc-canteen {
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 35%;
}

.pc-chevron {
    font-size: 0.58rem;
    color: var(--text-subtle);
    flex-shrink: 0;
}

.pc-dest {
    color: var(--text-main);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}

/* Special request */
.pc-special {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-muted);
    font-style: italic;
    background: var(--bg-surface);
    padding: 6px 10px;
    border-radius: 10px;
}

.pc-special .pi {
    font-size: 0.7rem;
    color: var(--text-subtle);
    flex-shrink: 0;
}

/* Footer */
.pc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 4px;
    border-top: 1px solid var(--divider-color);
}

.pc-role-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.65rem;
    font-weight: 800;
    padding: 3px 9px;
    border-radius: 7px;
}

.pc-role-pill.req {
    background: rgba(0, 61, 124, 0.08);
    color: var(--color-primary);
}

.pc-role-pill.run {
    background: rgba(239, 124, 0, 0.1);
    color: var(--color-accent);
}

.pc-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.74rem;
    min-width: 0;
}

.pc-person {
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100px;
}

.pc-sep {
    color: var(--text-subtle);
    flex-shrink: 0;
}

.pc-time {
    color: var(--text-subtle);
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
}

/* ── Show more + spacer ─────────────────────── */
.show-more-btn {
    display: block;
    width: 100%;
    margin: 8px 0 4px;
    padding: 13px;
    border: 1.5px dashed var(--border-color);
    border-radius: 16px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.show-more-btn:active {
    background: var(--bg-surface);
    color: var(--text-main);
}

.bottom-spacer {
    height: 100px;
}
</style>
