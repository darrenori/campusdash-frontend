<template>
    <Transition name="sheet-fade">
        <div v-if="visible" class="sheet-overlay" @click.self="$emit('close')">
            <div class="sheet" role="dialog" aria-modal="true" aria-label="Order details">
                <header class="sheet-head">
                    <h2 class="sheet-title">Order details</h2>
                    <button class="close-btn" aria-label="Close" @click="$emit('close')">
                        <i class="pi pi-times"></i>
                    </button>
                </header>

                <div class="info-card">
                    <div class="info-row">
                        <span class="label">Order ID</span>
                        <span class="value">{{ paddedId }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Status</span>
                        <span class="value status" :class="order.status">{{ statusLabel }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Buyer</span>
                        <span class="value">{{ buyerName }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Runner</span>
                        <span class="value">{{ runnerName || '—' }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Item</span>
                        <span class="value">{{ order.item }}</span>
                    </div>
                    <div class="info-row">
                        <span class="label">Stall</span>
                        <span class="value">{{ order.stall }}<template v-if="order.canteen"> · {{ order.canteen }}</template></span>
                    </div>
                    <div class="info-row">
                        <span class="label">Deliver to</span>
                        <span class="value">{{ order.deliveryLocation || '—' }}</span>
                    </div>
                    <div v-if="order.deliveryInfo" class="info-row">
                        <span class="label">Delivery info</span>
                        <span class="value">{{ order.deliveryInfo }}</span>
                    </div>
                    <div v-if="order.specialRequest" class="info-row">
                        <span class="label">Special request</span>
                        <span class="value">{{ order.specialRequest }}</span>
                    </div>
                </div>

                <div class="timeline">
                    <div class="tl-item">
                        <i class="pi pi-circle-fill"></i>
                        <span>Requested</span>
                        <time>{{ fmt(order.createdAt) }}</time>
                    </div>
                    <div v-if="order.acceptedAt" class="tl-item">
                        <i class="pi pi-circle-fill"></i>
                        <span>Accepted</span>
                        <time>{{ fmt(order.acceptedAt) }}</time>
                    </div>
                    <div v-if="order.collectedAt" class="tl-item">
                        <i class="pi pi-circle-fill"></i>
                        <span>Picked up</span>
                        <time>{{ fmt(order.collectedAt) }}</time>
                    </div>
                    <div v-if="order.deliveredAt" class="tl-item done">
                        <i class="pi pi-check-circle"></i>
                        <span>Completed</span>
                        <time>{{ fmt(order.deliveredAt) }}</time>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    order: { type: Object, required: true },
    buyerName: { type: String, default: '' },
    runnerName: { type: String, default: '' },
});

defineEmits(['close']);

const paddedId = computed(() => `#${String(props.order.id).padStart(8, '0')}`);

const statusLabel = computed(() => {
    const map = { open: 'Open', accepted: 'In progress', completed: 'Completed', cancelled: 'Cancelled' };
    return map[props.order.status] || props.order.status;
});

function fmt(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
</script>

<style scoped>
.sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 1100;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
}

@media (min-width: 761px) {
    .sheet-overlay {
        align-items: center;
    }
}

.sheet {
    width: 100%;
    max-width: 440px;
    background: var(--bg-surface);
    border-radius: 24px 24px 0 0;
    padding: 18px 20px 28px;
    max-height: 88vh;
    overflow-y: auto;
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.3);
}

@media (min-width: 761px) {
    .sheet {
        border-radius: 24px;
    }
}

.sheet-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.sheet-title {
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--text-main);
}

.close-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: var(--bg-input);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
}

.close-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.info-card {
    border: 1px solid var(--border-color);
    border-radius: 16px;
    overflow: hidden;
    background: var(--bg-card);
}

.info-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 11px 14px;
    border-bottom: 1px solid var(--divider-color);
}

.info-row:last-child {
    border-bottom: none;
}

.label {
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
    flex-shrink: 0;
}

.value {
    color: var(--text-main);
    font-size: 0.85rem;
    font-weight: 600;
    text-align: right;
    overflow-wrap: anywhere;
}

.value.status {
    text-transform: capitalize;
}

.value.status.completed { color: var(--color-success); }
.value.status.cancelled { color: var(--color-error); }
.value.status.accepted { color: var(--color-accent); }

.timeline {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.tl-item {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text-muted);
    font-size: 0.82rem;
}

.tl-item i {
    font-size: 0.55rem;
    color: var(--text-subtle);
}

.tl-item.done i {
    font-size: 0.95rem;
    color: var(--color-success);
}

.tl-item time {
    margin-left: auto;
    color: var(--text-subtle);
    font-size: 0.78rem;
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
    transition: opacity 0.2s ease;
}

.sheet-fade-enter-from,
.sheet-fade-leave-to {
    opacity: 0;
}
</style>
