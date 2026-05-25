<template>
    <div class="request-card">

        <div class="card-head">
            <div class="who">
                <div class="pfp">
                    <img v-if="resolvedPfpUrl" :src="resolvedPfpUrl" :alt="request.requester.name" class="pfp-img" />
                    <i v-else class="pi pi-user pfp-icon"></i>
                </div>
                <div class="who-meta">
                    <span class="username">@{{ request.requester.name }}</span>
                    <span class="items">
                        {{ itemCount }} {{ itemCount === 1 ? 'item' : 'items' }}
                        <span class="presence" :class="{ online: requesterOnline }">
                            {{ requesterOnline ? 'Online' : 'Offline' }}
                        </span>
                    </span>
                </div>
            </div>
            <span class="stall-tag" :style="stallStyle">{{ request.stall }}</span>
        </div>

        <div class="divider"></div>

        <div class="card-body">
            <div class="route">
                <div class="route-row">
                    <span class="pin-col"><i class="pi pi-map-marker pin"></i></span>
                    <span class="loc">{{ request.canteen }}</span>
                </div>
                <div class="route-row line-row">
                    <span class="pin-col"><span class="dotline"></span></span>
                </div>
                <div class="route-row">
                    <span class="pin-col"><i class="pi pi-map-marker pin dest"></i></span>
                    <span class="loc loc-dest">{{ request.deliveryLocation }}</span>
                </div>
            </div>

            <div class="order">
                <span class="item-text">{{ request.item }}</span>
                <button v-if="!isOwn" class="accept-btn" :disabled="accepting" @click="$emit('accept', request.id)">
                    {{ accepting ? 'ACCEPTING…' : 'ACCEPT' }}
                </button>
                <div v-else class="own-order-status">
                    <i class="pi pi-clock"></i>
                    <span>YOUR ORDER</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    request: {
        type: Object,
        required: true
    },
    accepting: {
        type: Boolean,
        default: false
    },
    requesterOnline: {
        type: Boolean,
        default: false
    },
    isOwn: {
        type: Boolean,
        default: false
    }
});

defineEmits(['accept']);

const resolvedPfpUrl = computed(() => {
    const rawUrl = props.request?.requester?.pfpUrl;
    if (!rawUrl) return null;

    let fileServerUrl = import.meta.env.VITE_FILE_SERVER_URL || '';

    if (fileServerUrl.endsWith('/')) {
        fileServerUrl = fileServerUrl.slice(0, -1);
    }

    return `${fileServerUrl}${rawUrl}`;
});

const itemCount = computed(() => {
    const lines = (props.request.item || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    return lines.length || 1;
});

const stallColorMap = {
    'Western': { bg: 'rgba(16, 185, 129, 0.14)', color: '#0e9f6e' },
    'Mala': { bg: 'rgba(239, 68, 68, 0.14)', color: '#e02424' },
    'Japanese': { bg: 'rgba(59, 130, 246, 0.13)', color: '#2563eb' },
};

const stallStyle = computed(() => {
    const colors = stallColorMap[props.request.stall]
        ?? { bg: 'rgba(239, 124, 0, 0.14)', color: '#EF7C00' };
    return { backgroundColor: colors.bg, color: colors.color };
});
</script>

<style scoped>
.request-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 28px;
    padding: 16px 18px;
    margin: 0 auto 14px;
    max-width: 640px;
    box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04),
        0 10px 28px rgba(16, 24, 40, 0.07);
    transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1),
        box-shadow 0.2s ease;
}

.request-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(16, 24, 40, 0.05),
        0 14px 34px rgba(16, 24, 40, 0.1);
}

/* ── Header ─────────────────────────────────── */
.card-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.who {
    display: flex;
    align-items: center;
    gap: 11px;
    min-width: 0;
}

.pfp {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 61, 124, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
}

.pfp-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pfp-icon {
    font-size: 1.2rem;
    color: #7aa0c4;
}

.who-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.username {
    font-size: 0.94rem;
    font-weight: 700;
    color: var(--text-main);
    line-height: 1.2;
    letter-spacing: -0.01em;
}

.items {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    color: var(--text-subtle);
}

.presence {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #b0b0b6;
    font-weight: 700;
}

.presence::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #b0b0b6;
}

.presence.online {
    color: #0e9f6e;
}

.presence.online::before {
    background: #0e9f6e;
}

.stall-tag {
    font-size: 0.6rem;
    font-weight: 800;
    padding: 6px 11px;
    border-radius: 14px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
}

.divider {
    height: 1px;
    background: var(--divider-color);
    margin: 14px 0;
}

/* ── Body: route + order ────────────────────── */
.card-body {
    display: flex;
    gap: 14px;
    align-items: stretch;
}

.route {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
}

.route-row {
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 22px;
}

.line-row {
    min-height: 14px;
}

.pin-col {
    width: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
}

.pin {
    font-size: 0.95rem;
    color: #b6c0cd;
}

.pin.dest {
    color: var(--color-primary);
}

.dotline {
    width: 0;
    height: 14px;
    border-left: 2px dotted #d3d3d8;
}

.loc {
    font-size: 0.85rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.loc-dest {
    color: var(--text-main);
    font-weight: 700;
}

.order {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    gap: 10px;
    width: 46%;
    flex-shrink: 0;
}

.item-text {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-primary);
    text-align: right;
    line-height: 1.32;
    white-space: pre-line;
}

/* ── Accept button ──────────────────────────── */
.accept-btn {
    width: 100%;
    background: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: 18px;
    padding: 11px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 61, 124, 0.22);
    transition: transform 0.14s ease, box-shadow 0.14s ease, opacity 0.14s ease;
}

.accept-btn:active {
    transform: scale(0.96);
    box-shadow: 0 2px 6px rgba(0, 61, 124, 0.2);
}

.accept-btn:disabled {
    opacity: 0.55;
    box-shadow: none;
    cursor: default;
}

/* ── Own order status ───────────────────────── */
.own-order-status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 11px 0;
    color: var(--color-accent);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    width: 100%;
    text-align: center;
}

.own-order-status i {
    font-size: 1rem;
}
</style>
