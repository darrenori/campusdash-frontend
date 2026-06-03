<template>
    <Transition name="drawer-slide">
        <section v-if="visible && request" class="delivery-drawer" :class="{ expanded: isExpanded }">
            <button type="button" class="drawer-handle-area" @click="toggleExpanded" @pointerdown="startDrag">
                <span class="drawer-handle"></span>
            </button>

            <!-- Unexpanded Drawer -->
            <div class="drawer-header">
                <div class="requester-block">
                    <div class="pfp">
                        <img v-if="resolvedPfpUrl" :src="resolvedPfpUrl" />
                        <i v-else class="pi pi-user"></i>
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
                <div class="info-card">
                    <div class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-file"></i>
                            </span>
                            <span>Order ID</span>
                        </div>
                        <div class="info-value">
                            {{ paddedOrderId }}
                            <i class="pi pi-copy copy-icon"></i>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <i class="pi pi-user"></i>
                            </span>
                            <span>Buyer</span>
                        </div>
                        <div class="info-value">
                            {{ request.requester?.name }}
                            <i class="pi pi-copy copy-icon"></i>
                        </div>
                    </div>

                    <div v-if="showRunner" class="info-row">
                        <div class="info-label">
                            <span class="info-icon-bubble">
                                <span class="svg-icon running-icon" aria-hidden="true"></span> </span>
                            <span>Runner</span>
                        </div>
                        <div class="info-value">
                            {{ request.deliverer?.name }}
                            <i class="pi pi-copy copy-icon"></i>
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
                        <strong>{{ request.stall }}</strong>
                    </div>

                    <p v-if="request.specialRequest" class="special-request">
                        {{ request.specialRequest }}
                    </p>
                </div>

                <button v-if="showAccept" type="button" class="accept-btn" :disabled="accepting"
                    @click="$emit('accept', request.id)">
                    {{ accepting ? 'ACCEPTING...' : 'ACCEPT' }}
                </button>

                <button v-else-if="showCancel" type="button" class="cancel-button" @click="$emit('cancel', request)">
                    CANCEL <span>(-10 PTS)</span>
                </button>
            </div>
        </section>
    </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    request: {
        type: Object,
        default: null
    },
    accepting: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: false
    }
});

defineEmits(['accept', 'cancel', 'chat']);

const isExpanded = ref(false);
const dragStartY = ref(null);

const isAccepted = computed(() => props.request?.status === 'accepted');

const showAccept = computed(() => {
    return !props.active && props.request?.status === 'open';
});

const showCancel = computed(() => {
    return props.active || isAccepted.value;
});

const showChat = computed(() => {
    return isAccepted.value || props.active;
});

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

const requesterInitial = computed(() => {
    return props.request?.requester?.name?.charAt(0)?.toUpperCase() || '?';
});

const resolvedPfpUrl = computed(() => {
    const rawUrl = props.request?.requester?.pfpUrl;
    if (!rawUrl) return null;

    let fileServerUrl = import.meta.env.VITE_FILE_SERVER_URL || '';

    if (fileServerUrl.endsWith('/')) {
        fileServerUrl = fileServerUrl.slice(0, -1);
    }

    return `${fileServerUrl}${rawUrl}`;
});

function toggleExpanded() {
    isExpanded.value = !isExpanded.value;
}

function startDrag(event) {
    dragStartY.value = event.clientY;

    window.addEventListener('pointerup', endDrag, { once: true });
}

function endDrag(event) {
    if (dragStartY.value === null) return;

    const deltaY = event.clientY - dragStartY.value;

    if (deltaY < -24) {
        isExpanded.value = true;
    }

    if (deltaY > 24) {
        isExpanded.value = false;
    }

    dragStartY.value = null;
}

watch(
    () => props.request?.id,
    () => {
        isExpanded.value = false;
    }
);
</script>

<style scoped>
.delivery-drawer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 50px;
    z-index: 900;
    background: white;
    border-radius: 28px 28px 0 0;
    padding: 0 20px 14px;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.22);
    overflow: hidden;
    max-height: 105px;
    transition: max-height 0.3s ease-out;
}

.delivery-drawer.expanded {
    max-height: calc(100dvh - 120px);
}

.expanded-content {
    padding: 16px 0;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease-out;
}

.delivery-drawer.expanded .expanded-content {
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
}

.requester-block {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
}

.pfp {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    border: 2px solid var(--color-primary);
    color: var(--color-primary);
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

.requester-name {
    color: var(--color-primary);
    font-size: 0.8rem;
    font-weight: 800;
}

.request-preview {
    margin-top: 4px;
    color: var(--color-primary);
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.chat-btn,
.unexpanded-accept-btn {
    border: none;
    background: white;
    color: var(--color-primary);
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
    box-shadow: 0 0 3px gray;
}

.unexpanded-accept-btn {
    background: var(--color-success);
    color: white;
}

.info-card {
    border: 1px solid lightgray;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 14px;
    background-color: rgb(243, 243, 243);
}

.info-row {
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid lightgray;
}

.info-row:last-child {
    border-bottom: none;
}

.info-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-primary);
    font-size: 0.68rem;
    font-weight: 700;
}

.info-icon-bubble {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.info-icon-bubble i {
    font-size: 0.75rem;
    color: var(--color-primary);
}

.svg-icon {
    width: 14px;
    height: 14px;
    display: block;
    background-color: var(--color-primary);
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

.copy-icon {
    font-size: 0.65rem;
}

.items-section {
    margin-bottom: 16px;
}

.items-section h3 {
    margin: 0 0 4px;
    color: var(--color-primary);
    font-size: 1rem;
    font-weight: 800;
}

.item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--color-primary);
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
.cancel-button {
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

.cancel-button {
    background: var(--color-error);
}

.cancel-button span {
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
</style>