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
                <span class="location-caption">Deliver to</span>
                <button type="button" class="location-btn" :class="{ nudge: showLocationNudge }"
                    @click="toggleLocationMenu">
                    <i class="pi pi-map-marker location-pin"></i>
                    <span>{{ form.deliveryLocation }}</span>
                    <i class="pi pi-chevron-down chevron" :class="{ rotated: menuOpen }"></i>
                </button>

                <div v-if="menuOpen" class="location-menu">
                    <button v-for="loc in presetLocations" :key="loc" type="button" class="location-option"
                        :class="{ active: loc === form.deliveryLocation }" @click="selectLocation(loc)">
                        {{ loc }}
                    </button>
                    <div class="custom-location">
                        <input v-model.trim="customLocation" placeholder="Search location" @focus="locationError = ''"
                            @input="locationError = ''" @blur="validateLocation" />
                    </div>
                    <div v-if="customLocation && filteredLocations.length" class="location-results">
                        <button v-for="loc in filteredLocations" :key="loc.id" type="button" class="location-result"
                            @click="selectLocation(loc.name)">
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
                        <p>{{ isDeliverer ? `Pick up ${activeRequest.item} from ${activeRequest.canteen}` :
                            `${activeRequest.requester.name} requested for ${activeRequest.item}` }}</p>
                    </div>
                </div>

                <div class="timeline-line" :class="{ solid: hasRunner, searching: !hasRunner }"></div>

                <div class="timeline-step" :class="{ done: hasRunner }">
                    <span class="step-dot">
                        <i v-if="hasRunner" class="pi pi-check"></i>
                        <span v-else class="search-pulse"></span>
                    </span>
                    <div class="step-copy">
                        <h2>{{ isDeliverer ? 'Deliver the Order' : (hasRunner ? 'Runner Found' : 'Finding Runner...') }}
                        </h2>
                        <p v-if="redirectingToMap">
                            Redirecting to Dashboard...
                        </p>
                        <p v-if="isDeliverer">
                            {{ activeRequest.deliveryLocation }}
                        </p>

                        <p v-else-if="hasRunner">
                            @{{ runnerName }}
                            <span class="runner-status" :class="{ online: runnerOnline }">
                                {{ runnerOnline ? 'Online' : 'Offline' }}
                            </span>
                        </p>

                        <p v-else>
                            Finding you a nearby runner...
                        </p>

                        <div v-if="activeRequest.collectedAt" class="pickup-time-row">
                            <i class="pi pi-shopping-bag"></i>
                            <span>Order picked up at {{ formatTime(activeRequest.collectedAt) }}</span>
                        </div>
                        <button v-if="hasRunner" type="button" class="complete-btn"
                            :disabled="completing || (isDeliverer && activeRequest.collectedAt)"
                            @click="isRequester ? completeOrder() : markCollected()">
                            {{ deliveryActionText }}
                        </button>
                    </div>
                </div>
            </div>

            <p v-if="error" class="form-error">{{ error }}</p>

            <div v-if="showCancelReason" class="cancel-panel-container" @click.self="closeCancelReason">
                <CancelPanel :needs-cancel-reason="needsCancelReason" :cancelling="cancelling" @cancel="cancelOrder"
                    @close="closeCancelReason" />
            </div>

            <button v-else-if="canCancelOrder" type="button" class="cancel-btn" :disabled="cancelling"
                @click="openCancelReason">
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
                <textarea id="item" v-model.trim="form.item" rows="3" placeholder="Iced Kopi C" maxlength="255"
                    @input="form.item = cleanRequestText(form.item)" required></textarea>
            </div>

            <div class="field">
                <label for="special">Special Request <span class="label-optional">(optional)</span></label>
                <textarea id="special" v-model.trim="form.specialRequest" rows="3"
                    placeholder="Please help me say lesser sugar..." maxlength="255"
                    @input="form.specialRequest = cleanRequestText(form.specialRequest)"></textarea>
            </div>

            <div class="field">
                <label for="deliveryInfo">Delivery Info <span class="label-optional">(optional)</span></label>
                <textarea id="deliveryInfo" v-model.trim="form.deliveryInfo" rows="3"
                    placeholder="e.g. I'm at the second table from the door" maxlength="255"
                    @input="form.deliveryInfo = cleanRequestText(form.deliveryInfo)"></textarea>
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';

import CancelPanel from '../components/CancelPanel.vue';
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
const showLocationNudge = ref(false);
const customLocation = ref('');

const LOCATION_HINT_KEY = 'cd_location_hint_seen';
const submitting = ref(false);
const cancelling = ref(false);
const completing = ref(false);
const activeLoading = ref(true);
const activeRequest = ref(null);
const error = ref(null);
const locationError = ref('');
const runnerOnline = ref(false);
const showCancelReason = ref(false);

const unsupportedTextPattern = /[<>\u0000-\u001F\u007F]|\b(?:https?:\/\/|www\.|javascript:|data:)/i;

const catalog = ref([]);

const canteenOptions = computed(() => catalog.value);
const presetLocations = computed(() => locations.value.slice(0, 10).map((location) => location.name));
const filteredLocations = computed(() => {
    const query = customLocation.value.trim().toLowerCase();
    if (!query) return [];

    const seen = new Set();
    return locations.value
        .filter((location) =>
            location.name.toLowerCase().includes(query)
            || location.code?.toLowerCase().includes(query)
            || location.aliases?.some((alias) => alias.toLowerCase().includes(query))
        )
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
    if (isDeliverer.value) return activeRequest.value?.collectedAt ? 'ORDER PICKED UP' : 'PICKED UP ORDER';
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

function toggleLocationMenu() {
    menuOpen.value = !menuOpen.value;
    if (menuOpen.value) showLocationNudge.value = false;
}

// One-time pulse on the location button so first-time users notice it's editable
function primeLocationNudge() {
    try {
        if (localStorage.getItem(LOCATION_HINT_KEY)) return;
        showLocationNudge.value = true;
        localStorage.setItem(LOCATION_HINT_KEY, '1');
    } catch (e) {
        // storage unavailable (e.g. private mode) — skip the nudge
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

    const exactMatch = locations.value.find((location) =>
        location.name.toLowerCase() === query
        || location.code?.toLowerCase() === query
        || location.aliases?.some((alias) => alias.toLowerCase() === query)
    );
    if (exactMatch) {
        selectLocation(exactMatch.name);
    } else {
        locationError.value = 'Choose a listed location.';
    }
}

function cleanRequestText(value) {
    return value.replace(/[<>\u0000-\u001F\u007F]/g, '').slice(0, 255);
}

function formatTime(value) {
    if (!value) return '';

    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });
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
            summary: 'Order Submitted',
            life: 3000,
        });
    } catch (e) {
        error.value = e.message;
    } finally {
        submitting.value = false;
    }
}

async function cancelOrder(payload = {}) {
    if (!activeRequest.value || cancelling.value) return;

    const hadPenalty = needsCancelReason.value;
    cancelling.value = true;
    error.value = null;

    try {
        const { points } = await apiRequest.patch(`/requests/${activeRequest.value.id}/cancel`, {
            reason: hadPenalty ? payload.reason : null,
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
        cancelOrder({ reason: null });
    }
}

function closeCancelReason() {
    showCancelReason.value = false;
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

async function markCollected() {
    if (!activeRequest.value || completing.value || !isDeliverer.value) return;
    completing.value = true;
    error.value = null;
    try {
        const { request } = await apiRequest.patch(`/requests/${activeRequest.value.id}/collected`, {});
        activeRequest.value = request;
        requestStore.setActiveRequest(request);
        toast.add({
            severity: 'success',
            summary: 'Collected Order',
            detail: 'The Runner has collected the order.',
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

    redirectToMapAfterRunnerFound();
}

function onCollected(payload) {
    const request = payload?.request;
    if (!request || request.id !== activeRequest.value?.id) return;
    activeRequest.value = request;
    requestStore.setActiveRequest(request);
    if (isRequester.value && request.status !== 'completed') {
        toast.add({
            severity: 'success',
            summary: 'Your order has been collected.',
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

// Redirect only when Runner Found while already on this page
const redirectingToMap = ref(false);
let redirectTimer = null;

function redirectToMapAfterRunnerFound() {
    if (redirectTimer) return;

    redirectingToMap.value = true;

    redirectTimer = setTimeout(() => {
        redirectingToMap.value = false;
        redirectTimer = null;
        router.replace('/');
    }, 3000);
}

onMounted(() => {
    loadActiveRequest();
    loadCatalog();
    loadLocations();
    primeLocationNudge();
    socket.on('request:active', onActiveRequest);
    socket.on('request:accepted', onAccepted);
    socket.on('request:collected', onCollected);
    socket.on('request:cancelled', onCancelled);
    socket.on('request:completed', onCompleted);
    socket.on('presence:update', onPresenceUpdate);
});

onUnmounted(() => {
    socket.off('request:active', onActiveRequest);
    socket.off('request:accepted', onAccepted);
    socket.off('request:collected', onCollected);
    socket.off('request:cancelled', onCancelled);
    socket.off('request:completed', onCompleted);
    socket.off('presence:update', onPresenceUpdate);

    if (redirectTimer) {
        clearTimeout(redirectTimer);
    }
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

.location-caption {
    display: block;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0;
}

.location-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.18);
    border: none;
    border-radius: 980px;
    padding: 6px 12px;
    cursor: pointer;
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0;
    transition: background 0.18s ease, transform 0.18s ease;
}

.location-btn:hover {
    background: rgba(255, 255, 255, 0.26);
}

.location-btn:active {
    transform: scale(0.97);
}

.location-pin {
    font-size: 0.82rem;
}

.location-btn.nudge {
    animation: locationNudge 1.3s ease-in-out 3;
}

@keyframes locationNudge {

    0%,
    100% {
        box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
    }

    50% {
        box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.14);
    }
}

.chevron {
    font-size: 0.62rem;
    opacity: 0.85;
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

.pickup-time-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    color: var(--theme-blue);
    font-size: 0.78rem;
    font-weight: 800;
}

.pickup-time-row i {
    font-size: 0.78rem;
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

.cancel-panel-container {
    position: fixed;
    inset: 0;
    z-index: 2000;
    padding: 24px;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
}

.cancel-panel-container :deep(.cancel-panel) {
    width: min(100%, 480px);
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

    0%,
    100% {
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

    0%,
    100% {
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
