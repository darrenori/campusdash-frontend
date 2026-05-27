<template>
    <div class="request-page">
        <!-- Orange header with wavy bottom -->
        <header class="req-header" :class="{ 'status-header': activeRequest }">
            <div class="brand" :class="{ 'status-brand': activeRequest }">
                <img src="../assets/logos/logo-square.svg" alt="" class="brand-logo" />
                <span v-if="activeRequest" class="brand-text brand-stack">
                    <span>CAMPUS</span>
                    <span>DASH</span>
                </span>
                <span v-else class="brand-text">DELIVER NOW</span>
            </div>

            <!-- Delivery location picker -->
            <div v-if="!activeLoading && !activeRequest" class="location-wrap">
                <button type="button" class="location-btn" @click="menuOpen = !menuOpen">
                    <span>{{ form.deliveryLocation }}</span>
                    <i class="pi pi-chevron-down chevron" :class="{ rotated: menuOpen }"></i>
                </button>

                <div v-if="menuOpen" class="location-menu">
                    <button
                        v-for="loc in presetLocations"
                        :key="loc"
                        type="button"
                        class="location-option"
                        :class="{ active: loc === form.deliveryLocation }"
                        @click="selectLocation(loc)"
                    >
                        {{ loc }}
                    </button>
                    <div class="custom-location">
                        <input
                            v-model.trim="customLocation"
                            placeholder="Search location"
                            @focus="locationError = ''"
                            @input="locationError = ''"
                            @blur="validateLocation"
                        />
                    </div>
                    <div v-if="customLocation && filteredLocations.length" class="location-results">
                        <button
                            v-for="loc in filteredLocations"
                            :key="loc.id"
                            type="button"
                            class="location-result"
                            @click="selectLocation(loc.name)"
                        >
                            {{ loc.name }}
                        </button>
                    </div>
                    <p v-if="locationError" class="location-error">{{ locationError }}</p>
                </div>
            </div>

            <svg class="header-wave" viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,26 C150,2 330,60 500,34 L500,70 L0,70 Z" class="wave-fill" />
            </svg>
        </header>

        <!-- Click-catcher closes the location menu -->
        <div v-if="menuOpen" class="menu-backdrop" @click="menuOpen = false"></div>

        <div v-if="activeLoading" class="status-panel">
            <p class="status-muted">Loading your active order...</p>
        </div>

        <!-- Active order status -->
        <section v-else-if="activeRequest" class="status-panel">
            <div class="timeline" :class="{ accepted: hasRunner }">
                <div class="timeline-step done">
                    <span class="step-dot"><i class="pi pi-check"></i></span>
                    <div class="step-copy">
                        <h2>{{ isDeliverer ? 'Delivery Accepted' : 'Request Submitted' }}</h2>
                        <p>{{ isDeliverer ? `Pick up ${activeRequest.item} from ${activeRequest.canteen}` : `${activeRequest.requester.name} requested for ${activeRequest.item}` }}</p>
                    </div>
                </div>

                <div class="timeline-line" :class="{ solid: hasRunner, searching: !hasRunner }"></div>

                <div class="timeline-step" :class="{ done: hasRunner }">
                    <span class="step-dot">
                        <i v-if="hasRunner" class="pi pi-check"></i>
                        <span v-else class="search-pulse"></span>
                    </span>
                    <div class="step-copy">
                        <h2>{{ isDeliverer ? 'Deliver the Order' : (hasRunner ? 'Runner Found' : 'Finding Runner...') }}</h2>
                        <p>
                            <template v-if="isDeliverer">
                                {{ activeRequest.deliveryLocation }}
                                <span v-if="activeRequest.deliveredAt" class="runner-status online">Delivered</span>
                            </template>
                            <template v-else-if="hasRunner">
                                @{{ runnerName }}
                                <span class="runner-status" :class="{ online: runnerOnline }">
                                    {{ runnerOnline ? 'Online' : 'Offline' }}
                                </span>
                            </template>
                            <template v-else>Finding you a nearby runner...</template>
                        </p>
                        <button v-if="hasRunner" type="button" class="complete-btn" :disabled="completing || (isDeliverer && activeRequest.deliveredAt)" @click="isRequester ? completeOrder() : markDelivered()">
                            {{ deliveryActionText }}
                        </button>
                    </div>
                </div>
            </div>

            <p v-if="error" class="form-error">{{ error }}</p>

            <div v-if="showCancelReason" class="cancel-panel">
                <div class="cancel-panel-head">
                    <h3>Cancel delivery?</h3>
                    <button type="button" class="cancel-close" :disabled="cancelling" @click="closeCancelReason">
                        <i class="pi pi-times"></i>
                    </button>
                </div>
                <p>Let the other person know what happened.</p>
                <p v-if="needsCancelReason" class="cancel-penalty">
                    Since a runner has been matched, you will lose 1 point if you cancel.
                </p>
                <textarea
                    v-model.trim="cancelReason"
                    rows="3"
                    placeholder="e.g. I can no longer make it in time"
                    maxlength="255"
                    @input="cancelReason = cleanRequestText(cancelReason)"
                ></textarea>
                <div class="cancel-actions">
                    <button type="button" class="keep-btn" :disabled="cancelling" @click="closeCancelReason">Keep Order</button>
                    <button type="button" class="cancel-btn compact" :disabled="cancelling" @click="cancelOrder">
                        {{ cancelling ? 'CANCELLING...' : 'CONFIRM CANCEL' }}
                    </button>
                </div>
            </div>

            <button v-else-if="canCancelOrder" type="button" class="cancel-btn" :disabled="cancelling" @click="openCancelReason">
                {{ cancelling ? 'CANCELLING...' : 'CANCEL ORDER' }}
            </button>
        </section>

        <!-- Form -->
        <form v-else class="req-form" @submit.prevent="submit">
            <div class="field">
                <label for="canteen">Requested Canteen</label>
                <div class="select-wrap">
                    <select id="canteen" v-model="form.canteenId" required @change="onCanteenChange">
                        <option value="" disabled>Choose a canteen</option>
                        <option v-for="c in canteenOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                    <i class="pi pi-chevron-down select-icon"></i>
                </div>
            </div>

            <div class="field">
                <label for="stall">Stall</label>
                <div class="select-wrap">
                    <select id="stall" v-model="form.stallId" required :disabled="!form.canteenId">
                        <option value="" disabled>
                            {{ form.canteenId ? 'Choose a stall' : 'Pick a canteen first' }}
                        </option>
                        <option v-for="s in stallOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
                    </select>
                    <i class="pi pi-chevron-down select-icon"></i>
                </div>
            </div>

            <div class="field">
                <label for="item">Item</label>
                <textarea
                    id="item"
                    v-model.trim="form.item"
                    rows="3"
                    placeholder="Iced Kopi C"
                    maxlength="255"
                    @input="form.item = cleanRequestText(form.item)"
                    required
                ></textarea>
            </div>

            <div class="field">
                <label for="special">Special Request <span class="label-optional">(optional)</span></label>
                <textarea
                    id="special"
                    v-model.trim="form.specialRequest"
                    rows="3"
                    placeholder="Please help me say lesser sugar..."
                    maxlength="255"
                    @input="form.specialRequest = cleanRequestText(form.specialRequest)"
                ></textarea>
            </div>

            <div class="field">
                <label for="deliveryInfo">Delivery Info <span class="label-optional">(optional)</span></label>
                <textarea
                    id="deliveryInfo"
                    v-model.trim="form.deliveryInfo"
                    rows="3"
                    placeholder="e.g. I'm at the second table from the door"
                    maxlength="255"
                    @input="form.deliveryInfo = cleanRequestText(form.deliveryInfo)"
                ></textarea>
            </div>

            <p v-if="error" class="form-error">{{ error }}</p>

            <button type="submit" class="submit-btn" :disabled="submitting">
                {{ submitting ? 'Submitting…' : 'Submit Request' }}
            </button>
        </form>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';
import BottomNav from '../components/BottomNav.vue';

const toast = useToast();
const router = useRouter();
const socket = getSocket();
const authStore = useAuthStore();
const requestStore = useRequestStore();

//will change based on their current location
const fallbackLocations = [
    'LT28', 'LT27', 'LT29', 'LT1', 'LT13',
    'COM1', 'COM2', 'AS6', 'S16', 'UTown',
];
const locations = ref(fallbackLocations.map((name, index) => ({ id: index + 1, name })));

const form = ref({
    deliveryLocation: 'LT28',
    canteenId: '',
    stallId: '',
    item: '',
    specialRequest: '',
    deliveryInfo: '',
});
const menuOpen = ref(false);
const customLocation = ref('');
const submitting = ref(false);
const cancelling = ref(false);
const completing = ref(false);
const activeLoading = ref(true);
const activeRequest = ref(null);
const error = ref(null);
const locationError = ref('');
const runnerOnline = ref(false);
const showCancelReason = ref(false);
const cancelReason = ref('');

const unsupportedTextPattern = /[<>\u0000-\u001F\u007F]|\b(?:https?:\/\/|www\.|javascript:|data:)/i;

const catalog = ref([]);

const canteenOptions = computed(() => catalog.value);
const presetLocations = computed(() => locations.value.slice(0, 10).map((location) => location.name));
const filteredLocations = computed(() => {
    const query = customLocation.value.trim().toLowerCase();
    if (!query) return [];

    const seen = new Set();
    return locations.value
        .filter((location) => location.name.toLowerCase().includes(query) || location.code?.toLowerCase().includes(query))
        .filter((location) => {
            const key = location.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .slice(0, 6);
});
const stallOptions = computed(() => {
    const canteen = catalog.value.find((c) => c.id === form.value.canteenId);
    return canteen ? canteen.stalls : [];
});
const hasActualRunner = computed(() => activeRequest.value?.status === 'accepted' && activeRequest.value?.deliverer);
const hasRunner = computed(() => hasActualRunner.value);
const runnerName = computed(() => activeRequest.value?.deliverer?.name || '');
const currentUserId = computed(() => authStore.user?.id ?? authStore.user?.userId);
const isRequester = computed(() => Number(activeRequest.value?.requester?.id) === Number(currentUserId.value));
const isDeliverer = computed(() => Number(activeRequest.value?.deliverer?.id) === Number(currentUserId.value));
const needsCancelReason = computed(() => activeRequest.value?.status === 'accepted');
const canCancelOrder = computed(() => ['open', 'accepted'].includes(activeRequest.value?.status));
const deliveryActionText = computed(() => {
    if (completing.value) return isRequester.value ? 'COMPLETING...' : 'SAVING...';
    if (isDeliverer.value) return activeRequest.value?.deliveredAt ? 'DELIVERED' : 'I HAVE DELIVERED';
    return 'COMPLETE ORDER';
});

function onCanteenChange() {
    form.value.stallId = '';
}

function joinOrderRoom(request) {
    if (!request?.id) return;
    socket.emit('request:join', { requestId: request.id });
}

function checkRunnerPresence(request = activeRequest.value) {
    const delivererId = request?.deliverer?.id;
    if (!delivererId) {
        runnerOnline.value = false;
        return;
    }
    socket.emit('presence:check', { userId: delivererId }, (response) => {
        runnerOnline.value = Boolean(response?.online);
    });
}

async function loadActiveRequest() {
    try {
        const { request } = await apiRequest.get('/requests/active');
        activeRequest.value = request;
        requestStore.setActiveRequest(request);
        joinOrderRoom(request);
        checkRunnerPresence(request);
    } catch (e) {
        error.value = e.message;
    } finally {
        activeLoading.value = false;
    }
}

async function loadCatalog() {
    try {
        const { canteens } = await apiRequest.get('/catalog');
        catalog.value = canteens;
    } catch (e) {
        error.value = e.message;
    }
}

async function loadLocations() {
    try {
        const { locations: data } = await apiRequest.get('/locations');
        locations.value = data;
    } catch (e) {
        locations.value = fallbackLocations.map((name, index) => ({ id: index + 1, name }));
    }
}

function selectLocation(loc) {
    form.value.deliveryLocation = loc;
    customLocation.value = '';
    locationError.value = '';
    menuOpen.value = false;
}

function validateLocation() {
    const query = customLocation.value.trim().toLowerCase();
    if (!query) {
        locationError.value = '';
        return;
    }

    const exactMatch = locations.value.find((location) => location.name.toLowerCase() === query || location.code?.toLowerCase() === query);
    if (exactMatch) {
        selectLocation(exactMatch.name);
    } else {
        locationError.value = 'Choose a listed location.';
    }
}

function cleanRequestText(value) {
    return value.replace(/[<>\u0000-\u001F\u007F]/g, '').slice(0, 255);
}

function validateRequestFields() {
    const selectedLocation = locations.value.some((location) => location.name === form.value.deliveryLocation);
    if (!selectedLocation) {
        error.value = 'Please choose a listed delivery location.';
        return false;
    }
    if (!form.value.item.trim()) {
        error.value = 'Item is required.';
        return false;
    }
    if ((authStore.user?.points ?? 0) <= 0) {
        error.value = 'You need at least 1 point to request an order.';
        return false;
    }
    if (unsupportedTextPattern.test(form.value.item) || unsupportedTextPattern.test(form.value.specialRequest) || unsupportedTextPattern.test(form.value.deliveryInfo)) {
        error.value = 'Please remove links or unsupported characters from your request.';
        return false;
    }
    return true;
}

async function submit() {
    error.value = null;
    if (!validateRequestFields()) return;

    submitting.value = true;
    try {
        const { request } = await apiRequest.post('/requests', {
            deliveryLocation: form.value.deliveryLocation,
            stallId: form.value.stallId,
            item: form.value.item,
            specialRequest: form.value.specialRequest,
            deliveryInfo: form.value.deliveryInfo,
        });
        activeRequest.value = request;
        requestStore.setActiveRequest(request);
        joinOrderRoom(request);
        toast.add({
            severity: 'success',
            summary: 'order submitted!',
            life: 3000,
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        submitting.value = false;
    }
}

async function cancelOrder() {
    if (!activeRequest.value || cancelling.value) return;
    if (needsCancelReason.value && !cancelReason.value.trim()) {
        error.value = 'Please add a reason before cancelling.';
        return;
    }
    const hadPenalty = needsCancelReason.value;
    cancelling.value = true;
    error.value = null;
    try {
        const { points } = await apiRequest.patch(`/requests/${activeRequest.value.id}/cancel`, {
            reason: hadPenalty ? cancelReason.value : null,
        });
        if (hadPenalty) {
            authStore.setPoints(points);
        }
        activeRequest.value = null;
        requestStore.clearActiveRequest();
        runnerOnline.value = false;
        closeCancelReason();
        router.replace('/');
        toast.add({
            severity: 'info',
            summary: 'Order cancelled',
        });
        if (!catalog.value.length) loadCatalog();
    } catch (e) {
        error.value = e.message;
    } finally {
        cancelling.value = false;
    }
}

function openCancelReason() {
    error.value = null;
    if (needsCancelReason.value) {
        showCancelReason.value = true;
    } else {
        cancelOrder();
    }
}

function closeCancelReason() {
    showCancelReason.value = false;
    cancelReason.value = '';
}

async function completeOrder() {
    if (!activeRequest.value || completing.value || !isRequester.value) return;
    completing.value = true;
    error.value = null;
    try {
        const { points } = await apiRequest.patch(`/requests/${activeRequest.value.id}/complete`, {});
        authStore.setPoints(points);
        activeRequest.value = null;
        requestStore.clearActiveRequest();
        runnerOnline.value = false;
        router.replace('/');
        toast.add({
            severity: 'success',
            summary: 'Order completed',
            life: 3000,
        });
        if (!catalog.value.length) loadCatalog();
    } catch (e) {
        error.value = e.message;
    } finally {
        completing.value = false;
    }
}

async function markDelivered() {
    if (!activeRequest.value || completing.value || !isDeliverer.value) return;
    completing.value = true;
    error.value = null;
    try {
        const { request } = await apiRequest.patch(`/requests/${activeRequest.value.id}/delivered`, {});
        activeRequest.value = request;
        requestStore.setActiveRequest(request);
        toast.add({
            severity: 'success',
            summary: 'Marked delivered',
            life: 3000,
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        completing.value = false;
    }
}

function onActiveRequest(request) {
    activeRequest.value = request;
    requestStore.setActiveRequest(request);
    joinOrderRoom(request);
    checkRunnerPresence(request);
}

function onAccepted(payload) {
    const request = payload?.request;
    if (!request || request.id !== activeRequest.value?.id) return;
    activeRequest.value = request;
    requestStore.setActiveRequest(request);
    joinOrderRoom(request);
    checkRunnerPresence(request);
}

function onDelivered(payload) {
    const request = payload?.request;
    if (!request || request.id !== activeRequest.value?.id) return;
    activeRequest.value = request;
    requestStore.setActiveRequest(request);
    if (isRequester.value && request.status !== 'completed') {
        toast.add({
            severity: 'success',
            summary: 'Your order has been marked as delivered.',
            life: 3000,
        });
    }
}

function onCancelled({ id, reason, cancelledBy }) {
    if (id !== activeRequest.value?.id) return;
    if (reason && Number(cancelledBy) !== Number(currentUserId.value)) {
        toast.add({
            severity: 'info',
            summary: 'Order cancelled',
            detail: reason,
        });
    }
    activeRequest.value = null;
    requestStore.clearActiveRequest();
    runnerOnline.value = false;
    closeCancelReason();
    router.replace('/');
    if (!catalog.value.length) loadCatalog();
}

function onCompleted({ id }) {
    if (id !== activeRequest.value?.id) return;
    if (isDeliverer.value) {
        authStore.adjustPoints(1);
    }
    activeRequest.value = null;
    requestStore.clearActiveRequest();
    runnerOnline.value = false;
    closeCancelReason();
    router.replace('/');
    if (!catalog.value.length) loadCatalog();
}

function onPresenceUpdate({ userId, online }) {
    if (Number(userId) === Number(activeRequest.value?.deliverer?.id)) {
        runnerOnline.value = Boolean(online);
    }
}

onMounted(() => {
    loadActiveRequest();
    loadCatalog();
    loadLocations();
    socket.on('request:active', onActiveRequest);
    socket.on('request:accepted', onAccepted);
    socket.on('request:delivered', onDelivered);
    socket.on('request:cancelled', onCancelled);
    socket.on('request:completed', onCompleted);
    socket.on('presence:update', onPresenceUpdate);
});

onUnmounted(() => {
    socket.off('request:active', onActiveRequest);
    socket.off('request:accepted', onAccepted);
    socket.off('request:delivered', onDelivered);
    socket.off('request:cancelled', onCancelled);
    socket.off('request:completed', onCompleted);
    socket.off('presence:update', onPresenceUpdate);
});
</script>

<style scoped>
.request-page {
    height: 100dvh;
    overflow-y: auto;
    background: var(--bg-card);
    display: flex;
    flex-direction: column;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

/* ── Orange header ───────────────────────────── */
.req-header {
    position: relative;
    flex-shrink: 0;
    background: var(--color-accent);
    padding: 28px 24px 56px;
}

.req-header.status-header {
    padding: 30px 28px 76px;
}

.brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.brand.status-brand {
    gap: 0;
}

.brand-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    filter: brightness(0) invert(1);
}

.status-brand .brand-logo {
    width: 58px;
    height: 58px;
}

.brand-text {
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
}

.brand-stack {
    display: flex;
    flex-direction: column;
    margin-top: -4px;
    font-size: 1.72rem;
    font-style: italic;
    font-weight: 900;
    line-height: 0.9;
    letter-spacing: 0;
}

/* ── Location picker ─────────────────────────── */
.location-wrap {
    position: relative;
    margin-top: 6px;
    width: max-content;
    z-index: 20;
}

.location-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    padding: 2px 0;
    cursor: pointer;
    color: #ffffff;
    font-size: 1.5rem;
    font-weight: 900;
    letter-spacing: 0;
}

.chevron {
    font-size: 0.85rem;
    transition: transform 0.25s ease;
}

.chevron.rotated {
    transform: rotate(180deg);
}

.location-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    background: var(--bg-card);
    border-radius: 28px;
    box-shadow: 0 12px 34px rgba(16, 24, 40, 0.2);
    padding: 14px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    width: 280px;
}

.location-option {
    background: var(--bg-input);
    border: none;
    border-radius: 14px;
    padding: 13px 10px;
    font-size: 0.85rem;
    font-weight: 800;
    color: var(--text-main);
    cursor: pointer;
    transition: background 0.12s ease;
}

.location-option:hover {
    filter: brightness(0.95);
}

.location-option.active {
    background: var(--color-accent);
    color: #ffffff;
}

.custom-location {
    grid-column: 1 / -1;
    display: flex;
    gap: 10px;
    margin-top: 4px;
}

.custom-location input {
    flex: 1;
    min-width: 0;
    background: var(--bg-input);
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 13px 14px;
    font-size: 0.82rem;
    font-family: inherit;
    font-weight: 600;
    color: var(--text-main);
}

.custom-location input:focus {
    outline: none;
    border-color: var(--color-accent);
    background: var(--bg-card);
}

.location-error {
    grid-column: 1 / -1;
    margin: -2px 4px 0;
    color: var(--color-error);
    font-size: 0.74rem;
    font-weight: 600;
}

.location-results {
    grid-column: 1 / -1;
    display: grid;
    gap: 6px;
}

.location-result {
    width: 100%;
    background: var(--bg-card);
    border: 1px solid rgba(0, 61, 124, 0.12);
    border-radius: 12px;
    padding: 10px 12px;
    color: var(--theme-blue);
    font-family: inherit;
    font-size: 0.84rem;
    font-weight: 800;
    text-align: left;
    cursor: pointer;
}

.menu-backdrop {
    position: fixed;
    inset: 0;
    z-index: 10;
}

.header-wave {
    position: absolute;
    left: 0;
    bottom: -1px;
    width: 100%;
    height: 56px;
    display: block;
}

/* ── Form ────────────────────────────────────── */
.req-form {
    flex: 1;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    padding: 8px 24px 110px;
    display: flex;
    flex-direction: column;
    gap: 22px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field label {
    font-size: 1.05rem;
    font-weight: 900;
    color: var(--text-main);
    letter-spacing: 0;
}

.label-optional {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted);
}

.field input,
.field textarea,
.field select {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 1rem;
    font-family: inherit;
    font-weight: 600;
    color: var(--text-main);
    -webkit-user-select: text;
    user-select: text;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.field input::placeholder,
.field textarea::placeholder {
    color: var(--text-muted);
}

.field input:focus,
.field textarea:focus,
.field select:focus {
    outline: none;
    background: var(--bg-card);
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(239, 124, 0, 0.13);
}

.field select:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.field textarea {
    resize: none;
    line-height: 1.4;
}

.select-wrap {
    position: relative;
}

.select-wrap select {
    appearance: none;
    -webkit-appearance: none;
    cursor: pointer;
}

.select-icon {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    color: var(--text-muted);
    pointer-events: none;
}

.form-error {
    margin: 0;
    color: var(--color-error);
    font-size: 0.85rem;
}

.status-panel {
    flex: 1;
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
    padding: 16px 28px 110px;
    display: flex;
    flex-direction: column;
}

.status-muted {
    margin: 24px 0;
    color: var(--text-muted);
    font-size: 0.95rem;
}

.timeline {
    margin-top: 0;
    flex: 1;
}

.timeline.accepted .timeline-line {
    height: 58px;
}

.timeline-step {
    display: grid;
    grid-template-columns: 46px 1fr;
    gap: 12px;
    align-items: start;
}

.step-dot {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: #244783;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
}

.timeline-step:not(.done) .step-dot {
    background: #244783;
    animation: runnerPulse 1.25s ease-in-out infinite;
}

.step-copy {
    padding-top: 1px;
    min-width: 0;
}

.step-copy h2 {
    margin: 0 0 3px;
    color: var(--text-main);
    font-size: 1.12rem;
    line-height: 1.2;
    font-weight: 900;
    letter-spacing: 0;
}

.step-copy p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.35;
    overflow-wrap: anywhere;
}

.runner-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: 8px;
    color: #b0b0b6;
    font-size: 0.72rem;
    font-weight: 700;
}

.runner-status::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #b0b0b6;
}

.runner-status.online {
    color: #0e9f6e;
}

.runner-status.online::before {
    background: #0e9f6e;
}

.timeline-line {
    width: 0;
    height: 74px;
    border-left: 3px dotted #244783;
    margin-left: 21px;
}

.timeline-line.searching {
    animation: dashFlow 1.1s linear infinite;
}

.timeline-line.solid {
    border-left-style: solid;
}

.search-pulse {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #ffffff;
    box-shadow:
        -8px 0 0 rgba(255, 255, 255, 0.45),
        8px 0 0 rgba(255, 255, 255, 0.45);
    animation: searchDots 0.9s ease-in-out infinite;
}

.cancel-panel {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 16px;
    display: grid;
    gap: 10px;
    box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
}

.cancel-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.cancel-panel h3 {
    margin: 0;
    color: var(--text-main);
    font-size: 1rem;
    font-weight: 900;
}

.cancel-panel p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.35;
}

.cancel-penalty {
    color: var(--color-danger) !important;
}

.cancel-panel textarea {
    width: 100%;
    resize: none;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 12px 14px;
    background: var(--bg-card);
    color: var(--text-main);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.35;
}

.cancel-panel textarea:focus {
    outline: none;
    border-color: var(--color-danger);
    box-shadow: 0 0 0 4px rgba(211, 58, 44, 0.12);
}

.cancel-close {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: var(--bg-card);
    color: var(--text-muted);
    cursor: pointer;
}

.cancel-actions {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 10px;
}

.keep-btn {
    border: none;
    border-radius: 14px;
    padding: 12px 10px;
    background: var(--bg-card);
    color: var(--text-main);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
}

.complete-btn,
.cancel-btn {
    border: none;
    border-radius: 14px;
    color: #ffffff;
    font-family: inherit;
    font-weight: 800;
    cursor: pointer;
}

.complete-btn {
    width: 100%;
    margin-top: 8px;
    background: var(--color-info);
    padding: 12px 14px;
    font-size: 0.88rem;
    box-shadow: 0 8px 18px rgba(36, 71, 131, 0.18);
}

.complete-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

.cancel-btn {
    width: 100%;
    background: var(--color-danger);
    padding: 18px 16px;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
    box-shadow: 0 8px 18px rgba(211, 58, 44, 0.18);
}

.cancel-btn.compact {
    padding: 12px 10px;
    font-size: 0.78rem;
}

.cancel-btn:disabled {
    opacity: 0.6;
    cursor: default;
}

@keyframes runnerPulse {
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(36, 71, 131, 0.26);
        transform: scale(1);
    }
    50% {
        box-shadow: 0 0 0 10px rgba(36, 71, 131, 0);
        transform: scale(1.04);
    }
}

@keyframes dashFlow {
    0% {
        opacity: 0.35;
        transform: translateY(-2px);
    }
    50% {
        opacity: 1;
        transform: translateY(2px);
    }
    100% {
        opacity: 0.35;
        transform: translateY(-2px);
    }
}

@keyframes searchDots {
    0%, 100% {
        transform: scale(0.9);
        opacity: 0.7;
    }
    50% {
        transform: scale(1.12);
        opacity: 1;
    }
}

.submit-btn {
    margin-top: 8px;
    width: 100%;
    background: var(--color-primary);
    color: #ffffff;
    border: none;
    border-radius: 14px;
    padding: 16px;
    font-size: 1.02rem;
    font-weight: 900;
    letter-spacing: 0;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(0, 61, 124, 0.28);
    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}

.submit-btn:active {
    transform: scale(0.97);
    box-shadow: 0 4px 10px rgba(0, 61, 124, 0.24);
}

.submit-btn:disabled {
    opacity: 0.55;
    box-shadow: none;
    cursor: default;
}

.wave-fill {
    fill: var(--bg-card);
}
</style>
