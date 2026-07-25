<template>
    <Transition name="drawer-slide">
        <section v-if="visible && request" class="delivery-drawer"
            :class="{ expanded: isExpanded, dragging: isDragging }" :style="drawerDragStyle">
            <button type="button" class="drawer-handle-area" @pointerdown="startDrag">
                <span class="drawer-handle"></span>
            </button>

            <!-- Unexpanded Drawer -->
            <div class="drawer-header" @pointerdown="startCollapsedOrderSwipe">
                <div class="requester-block">
                    <div class="pfp-wrapper">
                        <div class="pfp">
                            <img v-if="resolvedPfpUrl" :src="resolvedPfpUrl" />
                            <i v-else class="pi pi-user"></i>
                        </div>

                        <span v-if="showOnlineIndicator" class="online-dot" :class="{ offline: !runnerOnline }"></span>
                    </div>

                    <div class="requester-text">
                        <div class="requester-name">
                            @{{ request.requester?.name }}
                        </div>
                        <div class="request-preview">
                            {{ itemPreview }}
                        </div>
                    </div>
                </div>

                <button v-if="showChat" type="button" class="chat-btn" @click="$emit('chat', request)">
                    <i class="pi pi-comments"></i>
                    <span>Chat</span>
                </button>

                <button v-else-if="showAccept && !isExpanded" type="button" class="unexpanded-accept-btn"
                    :disabled="accepting" @click="$emit('accept', request.id)">
                    ACCEPT
                </button>
            </div>

            <!-- Expanded Drawer -->
            <div class="expanded-content">
                <CancelPanel v-if="showCancelReason" class="cancel-panel" :needs-cancel-reason="needsCancelReason"
                    :cancelling="cancelling" @cancel="cancelOrder" @close="closeCancelReason" />

                <div v-else class="info-card">
                    <!-- For overlapped orders -->
                    <div v-if="showDestinationSwitcher" class="order-switcher-row">
                        <button type="button" class="order-switcher-btn" aria-label="Previous order"
                            @click.stop="selectNearbyRequest(-1)">
                            <i class="pi pi-chevron-left"></i>
                        </button>

                        <span class="order-switcher-label">
                            Order {{ currentDestinationRequestIndex + 1 }} of {{ destinationRequestOptions.length }}
                        </span>

                        <button type="button" class="order-switcher-btn" aria-label="Next order"
                            @click.stop="selectNearbyRequest(1)">
                            <i class="pi pi-chevron-right"></i>
                        </button>
                    </div>

                    <div class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-file"></i>
                            </span>
                            <span>Order ID</span>
                        </div>
                        <button type="button" class="info-value copy-value" @click="copyToClipboard(paddedOrderId)">
                            {{ justCopied === paddedOrderId ? 'Copied!' : paddedOrderId }}
                            <i class="pi pi-copy copy-icon"></i>
                        </button>
                    </div>

                    <div class="info-row route-info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-map-marker"></i>
                            </span>
                            <span>Route</span>
                        </div>
                        <div class="info-value route-value">
                            {{ routeDisplay }}
                        </div>
                    </div>

                    <div class="info-row clickable-info-row" @click="openUserProfileDialog(request.requester?.name)">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-user"></i>
                            </span>
                            <span>Buyer</span>
                        </div>

                        <button type="button" class="info-value copy-value"
                            @click.stop="copyToClipboard(request.requester?.name)">
                            {{ justCopied === request.requester?.name ? 'Copied!' : request.requester?.name }}
                            <i class="pi pi-copy copy-icon"></i>
                        </button>
                    </div>

                    <div v-if="showRunner" class="info-row clickable-info-row"
                        @click="openUserProfileDialog(request.deliverer?.name)">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <span class="svg-icon running-icon" aria-hidden="true"></span>
                            </span>
                            <span>Runner</span>
                        </div>

                        <button type="button" class="info-value copy-value"
                            @click.stop="copyToClipboard(request.deliverer?.name)">
                            {{ justCopied === request.deliverer?.name ? 'Copied!' : request.deliverer?.name }}
                            <i class="pi pi-copy copy-icon"></i>
                        </button>
                    </div>

                    <div v-if="request.collectedAt" class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-shopping-bag"></i>
                            </span>
                            <span>Picked Up</span>
                        </div>

                        <div class="info-value">
                            {{ formatTime(request.collectedAt) }}
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <span class="svg-icon scooter-icon" aria-hidden="true"></span> </span>
                            <span>Delivery Info</span>
                        </div>
                        <div class="info-value">
                            {{ request.deliveryInfo || '-' }}
                        </div>
                    </div>
                </div>

                <div class="items-section">
                    <h3>Items</h3>

                    <div class="item-row">
                        <span>{{ itemPreview }}</span>
                        <strong>{{ stallDisplay }}</strong>
                    </div>

                    <p v-if="request.specialRequest" class="special-request">
                        {{ request.specialRequest }}
                    </p>
                </div>

                <button v-if="showAccept" type="button" class="accept-btn" :disabled="accepting"
                    @click="$emit('accept', request.id)">
                    {{ accepting ? 'ACCEPTING...' : 'ACCEPT' }}
                </button>

                <button v-if="!showAccept && hasRunner" type="button" class="complete-btn"
                    :disabled="completing || (isDeliverer && request.collectedAt)" @click="handleDeliveryAction">
                    {{ deliveryActionText }}
                </button>

                <button v-if="!showAccept && canCancelOrder" type="button" class="cancel-btn" :disabled="cancelling"
                    @click="openCancelReason">
                    {{ cancelling ? 'CANCELLING...' : 'CANCEL' }}
                    <span v-if="needsCancelReason">(-1 PT)</span>
                </button>
            </div>
        </section>
    </Transition>

    <UserProfileDialog v-model:visible="showUserProfileDialog" :username="selectedProfileUsername" />
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useAuthStore } from '../stores/auth';
import { resolveFileUrl } from '../utils/fileUrl';
const authStore = useAuthStore();

import CancelPanel from './CancelPanel.vue';
import UserProfileDialog from './UserProfileDialog.vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    request: {
        type: Object,
        default: null
    },
    destinationRequests: {
        type: Array,
        default: () => []
    },
    accepting: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: false
    },
    cancelling: {
        type: Boolean,
        default: false
    },
    completing: {
        type: Boolean,
        default: false
    },
    runnerOnline: {
        type: Boolean,
        default: false
    },
    collapseSignal: {
        type: Number,
        default: 0
    }
});

const emit = defineEmits(['accept', 'cancel', 'complete', 'collected', 'chat', 'select-request']);

const showUserProfileDialog = ref(false);
const selectedProfileUsername = ref('');

function openUserProfileDialog(username) {
    const normalizedUsername = String(username || '').trim();

    if (!normalizedUsername) return;

    selectedProfileUsername.value = normalizedUsername;
    showUserProfileDialog.value = true;
}

const isAccepted = computed(() => props.request?.status === 'accepted');

const showAccept = computed(() => {
    return !props.active && props.request?.status === 'open';
});

// Cancel Panel
const showCancelReason = ref(false);

const needsCancelReason = computed(() => props.request?.status === 'accepted');

const canCancelOrder = computed(() => {
    return ['open', 'accepted'].includes(props.request?.status);
});

function openCancelReason() {
    if (needsCancelReason.value) {
        showCancelReason.value = true;
    } else {
        cancelOrder();
    }
}

function closeCancelReason() {
    showCancelReason.value = false;
}

function cancelOrder(payload = {}) {
    if (!props.request || props.cancelling) return;

    emit('cancel', {
        request: props.request,
        reason: payload.reason ?? null,
        error: payload.error
    });
}

watch(
    () => props.request?.id,
    () => {
        closeCancelReason();
        justCopied.value = null;
        showUserProfileDialog.value = false;
    }
);

watch(
    () => props.visible,
    (visible) => {
        if (visible) return;

        isExpanded.value = false;
    }
);

// User Roles
const currentUserId = computed(() => {
    return authStore.user?.id ?? authStore.user?.userId;
});

const isRequester = computed(() => {
    return Number(props.request?.requester?.id) === Number(currentUserId.value);
});

const isDeliverer = computed(() => {
    return Number(props.request?.deliverer?.id) === Number(currentUserId.value);
});

const hasRunner = computed(() => {
    return props.request?.status === 'accepted' && Boolean(props.request?.deliverer);
});

const deliveryActionText = computed(() => {
    if (props.completing) return isRequester.value ? 'COMPLETING...' : 'SAVING...';
    if (isDeliverer.value) return props.request?.collectedAt ? 'ORDER PICKED UP' : 'PICKED UP ORDER';
    return 'COMPLETE ORDER';
});

function handleDeliveryAction() {
    if (!props.request || props.completing) return;

    if (isRequester.value) {
        emit('complete', props.request);
        return;
    }

    if (isDeliverer.value && !props.request.collectedAt) {
        emit('collected', props.request);
    }
}

// Online Status
const showOnlineIndicator = computed(() => {
    return hasRunner.value && !isDeliverer.value;
});

// Chat
const showChat = computed(() => {
    return isAccepted.value || props.active;
});

// UI Elements
const showRunner = computed(() => {
    return props.request?.deliverer;
});

const paddedOrderId = computed(() => {
    return String(props.request?.id || '').padStart(8, '0');
});

const itemPreview = computed(() => {
    if (!props.request?.item) return '';
    return props.request.item;
});

const stallDisplay = computed(() => {
    const canteen = props.request?.canteen;
    const stall = props.request?.stall;

    if (canteen && stall) return `${canteen} - ${stall}`;
    if (stall) return stall;
    if (canteen) return canteen;
    return '-';
});

const routeDisplay = computed(() => {
    const destination = props.request?.deliveryLocation || '-';
    return `${stallDisplay.value} -> ${destination}`;
});

const destinationRequestOptions = computed(() => {
    if (props.destinationRequests?.length) return props.destinationRequests;
    return props.request ? [props.request] : [];
});

const currentDestinationRequestIndex = computed(() => {
    const index = destinationRequestOptions.value.findIndex((option) => option.id === props.request?.id);
    return index >= 0 ? index : 0;
});

const showDestinationSwitcher = computed(() => destinationRequestOptions.value.length > 1);

function selectNearbyRequest(direction) {
    if (!showDestinationSwitcher.value) return;

    const options = destinationRequestOptions.value;
    const nextIndex = (currentDestinationRequestIndex.value + direction + options.length) % options.length;

    emit('select-request', options[nextIndex]);
}

const resolvedPfpUrl = computed(() => {
    return resolveFileUrl(props.request?.requester?.pfpUrl);
});

// Drawer Drag
const isExpanded = ref(false);
const dragStartY = ref(null);
const dragStartHeight = ref(null);
const dragHeight = ref(null);
const didDrag = ref(false);
const isDragging = ref(false);
const collapsedSwipeStartX = ref(null);
const collapsedSwipeStartY = ref(null);

watch(
    () => props.collapseSignal,
    () => {
        isExpanded.value = false;
        dragHeight.value = null;
    }
);

const drawerDragStyle = computed(() => {
    if (dragHeight.value === null) return {};

    return {
        maxHeight: `${dragHeight.value}px`,
        transition: 'none'
    };
});

const COLLAPSED_DRAWER_HEIGHT = 105;
const EXPANDED_DRAWER_HEIGHT = 600;
const DRAG_INTENT_THRESHOLD = 4;
const DRAWER_SNAP_THRESHOLD = 40;
const ORDER_SWIPE_THRESHOLD = 45;
const ORDER_SWIPE_HORIZONTAL_RATIO = 1.2;

function getExpandedDrawerHeight() {
    return window.innerWidth <= 600
        ? window.innerHeight - 90
        : EXPANDED_DRAWER_HEIGHT;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function startDrag(event) {
    dragStartY.value = event.clientY;
    dragStartHeight.value = isExpanded.value
        ? getExpandedDrawerHeight()
        : COLLAPSED_DRAWER_HEIGHT;

    didDrag.value = false;
    isDragging.value = true;

    window.addEventListener('pointermove', onDrag);
    window.addEventListener('pointerup', endDrag, { once: true });
}

function onDrag(event) {
    if (dragStartY.value === null || dragStartHeight.value === null) return;

    const deltaY = dragStartY.value - event.clientY;

    if (Math.abs(deltaY) > DRAG_INTENT_THRESHOLD) {
        didDrag.value = true;
    }

    dragHeight.value = clamp(
        dragStartHeight.value + deltaY,
        COLLAPSED_DRAWER_HEIGHT,
        getExpandedDrawerHeight()
    );
}

function endDrag(event) {
    window.removeEventListener('pointermove', onDrag);

    if (dragStartY.value !== null) {
        const dragDistance = dragStartY.value - event.clientY;

        if (!didDrag.value) {
            isExpanded.value = !isExpanded.value;
        } else if (dragDistance > DRAWER_SNAP_THRESHOLD) {
            isExpanded.value = true;
        } else if (dragDistance < -DRAWER_SNAP_THRESHOLD) {
            isExpanded.value = false;
        }
    }

    dragStartY.value = null;
    dragStartHeight.value = null;
    dragHeight.value = null;
    didDrag.value = false;
    isDragging.value = false;
}

// Swipe left and right when drawer is closed to do quick switching between orders
function startCollapsedOrderSwipe(event) {
    if (isExpanded.value || !showDestinationSwitcher.value) return;
    if (event.target?.closest?.('button')) return;

    collapsedSwipeStartX.value = event.clientX;
    collapsedSwipeStartY.value = event.clientY;

    window.addEventListener('pointerup', endCollapsedOrderSwipe, { once: true });
}

function endCollapsedOrderSwipe(event) {
    if (collapsedSwipeStartX.value === null || collapsedSwipeStartY.value === null) return;

    const deltaX = event.clientX - collapsedSwipeStartX.value;
    const deltaY = event.clientY - collapsedSwipeStartY.value;

    collapsedSwipeStartX.value = null;
    collapsedSwipeStartY.value = null;

    if (Math.abs(deltaX) < ORDER_SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * ORDER_SWIPE_HORIZONTAL_RATIO) return;

    selectNearbyRequest(deltaX < 0 ? 1 : -1);
}

onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onDrag);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointerup', endCollapsedOrderSwipe);
});

function formatTime(value) {
    if (!value) return '';

    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Copy Button
const justCopied = ref(null);

async function copyToClipboard(value) {
    if (!value) return;

    const text = String(value);

    try {
        await navigator.clipboard.writeText(text);

        justCopied.value = text;

        setTimeout(() => {
            if (justCopied.value === text) {
                justCopied.value = null;
            }
        }, 2000);
    } catch {
        console.log("Failed to copy to clipboard:", text);
    }
}
</script>

<style scoped>
.delivery-drawer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 50px;
    z-index: 900;
    background: var(--drawer-bg);
    border-radius: 28px 28px 0 0;
    padding: 0 20px 14px;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.22);
    overflow: hidden;
    max-height: 105px;
    transition: max-height 0.3s ease-out;
}

.delivery-drawer.expanded {
    max-height: 600px;
    margin-bottom: 10px;
}

@media (max-width: 600px) {
    .delivery-drawer.expanded {
        max-height: calc(100dvh - 90px);
    }
}

.expanded-content {
    padding: 16px 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease-out;
}

.delivery-drawer.expanded .expanded-content,
.delivery-drawer.dragging .expanded-content {
    opacity: 1;
    pointer-events: auto;
}

.drawer-handle-area {
    width: 100%;
    height: 22px;
    border: none;
    background: transparent;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    touch-action: none;
}

.drawer-handle {
    width: 44px;
    height: 3px;
    border-radius: 999px;
    background: gray;
    opacity: 0.55;
}

.drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    touch-action: pan-y;
}

.requester-block {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.pfp-wrapper {
    position: relative;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
}

.pfp {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--drawer-text);
    color: var(--drawer-text);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    overflow: hidden;
    flex-shrink: 0;
}

.pfp img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.online-dot {
    position: absolute;
    right: 1px;
    bottom: 1px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #16a34a;
    border: 2px solid var(--drawer-text);
    z-index: 2;
}

.online-dot.offline {
    background: var(--drawer-bg);
}

.requester-name {
    color: var(--drawer-text);
    font-size: 0.8rem;
    font-weight: 800;
}

.request-preview {
    margin-top: 4px;
    color: var(--drawer-text);
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.complete-btn {
    width: 100%;
    border: none;
    border-radius: 4px;
    padding: 13px 18px;
    background: var(--theme-blue);
    color: white;
    font-weight: 900;
    font-size: 0.95rem;
    cursor: pointer;
}

.complete-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.cancel-btn {
    margin-top: 10px;
}

.chat-btn,
.unexpanded-accept-btn {
    border: none;
    background: var(--chat-button);
    color: var(--drawer-text);
    border-radius: 12px;
    padding: 10px 14px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    font-size: 0.8rem;
    cursor: pointer;
    flex-shrink: 0;
}

.chat-btn {
    box-shadow: 0 0 3px var(--text-subtle);
}

.unexpanded-accept-btn {
    background: var(--color-success);
    color: white;
}

.info-card {
    border: 1px solid var(--info-border);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 14px;
    background-color: var(--info-card);
}

.order-switcher-row {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--info-border);
}

.order-switcher-btn {
    width: 30px;
    height: 30px;
    border: 1px solid var(--info-border);
    border-radius: 50%;
    background: var(--drawer-bg);
    color: var(--drawer-text);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
}

.order-switcher-btn i {
    font-size: 0.7rem;
}

.order-switcher-label {
    color: var(--drawer-text);
    font-size: 0.78rem;
    font-weight: 800;
}

.info-row {
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--info-border);
}

.info-row:last-child {
    border-bottom: none;
}

.clickable-info-row {
    cursor: pointer;
}

.clickable-info-row:hover {
    background: rgba(0, 0, 0, 0.04);
}

.info-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--drawer-text);
    font-size: 0.68rem;
    font-weight: 700;
}

.info-icon-bubble {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--bubble-bg);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.info-icon-bubble i {
    font-size: 0.75rem;
    color: var(--drawer-text);
}

.svg-icon {
    width: 14px;
    height: 14px;
    display: block;
    background-color: var(--drawer-text);
    flex-shrink: 0;
}

.running-icon {
    mask: url('../assets/icons/running.svg') center / contain no-repeat;
}

.scooter-icon {
    mask: url('../assets/icons/scooter.svg') center / contain no-repeat;
}

.info-value {
    display: flex;
    align-items: center;
    gap: 6px;
    color: gray;
    font-size: 0.8rem;
    text-align: right;
}

.route-info-row {
    align-items: flex-start;
}

.route-value {
    max-width: 62%;
    justify-content: flex-end;
    line-height: 1.35;
    word-break: break-word;
}

.copy-value {
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    font-family: inherit;
    cursor: pointer;
}

.copy-value:hover .copy-icon {
    opacity: 1;
}

.copy-icon {
    font-size: 0.65rem;
    opacity: 0.7;
}

.items-section {
    margin-bottom: 16px;
}

.items-section h3 {
    margin: 0 0 4px;
    color: var(--drawer-text);
    font-size: 1rem;
    font-weight: 800;
}

.item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--drawer-text);
    font-size: 0.8rem;
}

.item-row strong {
    white-space: nowrap;
    font-weight: 800;
}

.special-request {
    margin: 8px 0 0;
    color: gray;
    font-size: 0.75rem;
}

.accept-btn,
.cancel-btn {
    width: 100%;
    border: none;
    border-radius: 4px;
    padding: 13px 18px;
    color: white;
    font-weight: 900;
    font-size: 0.95rem;
    cursor: pointer;
}

.accept-btn {
    background: var(--color-success);
}

.accept-btn:disabled,
.unexpanded-accept-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.cancel-btn {
    background: var(--color-danger);
}

.cancel-btn span {
    font-size: 0.9rem;
    font-weight: 600;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
    transition: transform 0.3s ease-out;
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
    transform: translateY(100%);
}

.cancel-panel {
    margin-bottom: 10px;
}
</style>