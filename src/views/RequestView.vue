<template>
    <div class="request-page">
        <!-- Orange header with wavy bottom -->
        <header class="req-header">
            <div class="brand">
                <img src="../assets/logos/logo-square.svg" alt="" class="brand-logo" />
                <span class="brand-text">DELIVER NOW</span>
            </div>

            <!-- Delivery location picker -->
            <div class="location-wrap">
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
                            placeholder="Type a location"
                            @keyup.enter="applyCustomLocation"
                        />
                        <button type="button" @click="applyCustomLocation">Set</button>
                    </div>
                </div>
            </div>

            <svg class="header-wave" viewBox="0 0 500 70" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,26 C150,2 330,60 500,34 L500,70 L0,70 Z" fill="#ffffff" />
            </svg>
        </header>

        <!-- Click-catcher closes the location menu -->
        <div v-if="menuOpen" class="menu-backdrop" @click="menuOpen = false"></div>

        <!-- Form -->
        <form class="req-form" @submit.prevent="submit">
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
                    required
                ></textarea>
            </div>

            <div class="field">
                <label for="special">Special Request</label>
                <textarea
                    id="special"
                    v-model.trim="form.specialRequest"
                    rows="3"
                    placeholder="Please help me say lesser sugar..."
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
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { apiRequest } from '../utils/api';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();
const toast = useToast();

//will change based on their current location
const presetLocations = [
    'LT28', 'LT27', 'LT29', 'LT1', 'LT13',
    'COM1', 'COM2', 'AS6', 'S16', 'UTown',
];

const form = ref({
    deliveryLocation: 'LT28',
    canteenId: '',
    stallId: '',
    item: '',
    specialRequest: '',
});
const menuOpen = ref(false);
const customLocation = ref('');
const submitting = ref(false);
const error = ref(null);

const catalog = ref([]);

const canteenOptions = computed(() => catalog.value);
const stallOptions = computed(() => {
    const canteen = catalog.value.find((c) => c.id === form.value.canteenId);
    return canteen ? canteen.stalls : [];
});

function onCanteenChange() {
    form.value.stallId = '';
}

onMounted(async () => {
    try {
        const { canteens } = await apiRequest.get('/catalog');
        catalog.value = canteens;
    } catch (e) {
        error.value = e.message;
    }
});

function selectLocation(loc) {
    form.value.deliveryLocation = loc;
    menuOpen.value = false;
}

function applyCustomLocation() {
    if (!customLocation.value) return;
    form.value.deliveryLocation = customLocation.value;
    customLocation.value = '';
    menuOpen.value = false;
}

async function submit() {
    submitting.value = true;
    error.value = null;
    try {
        await apiRequest.post('/requests', {
            deliveryLocation: form.value.deliveryLocation,
            stallId: form.value.stallId,
            item: form.value.item,
            specialRequest: form.value.specialRequest,
        });
        toast.add({
            severity: 'success',
            summary: 'Order Submitted!',
            life: 3000,
        });
        router.push('/');
    } catch (e) {
        error.value = e.message;
    } finally {
        submitting.value = false;
    }
}
</script>

<style scoped>
.request-page {
    height: 100dvh;
    overflow-y: auto;
    background: #ffffff;
    display: flex;
    flex-direction: column;
}

/* ── Orange header ───────────────────────────── */
.req-header {
    position: relative;
    flex-shrink: 0;
    background: #EF7C00;
    padding: 28px 24px 56px;
}

.brand {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.brand-logo {
    width: 52px;
    height: 52px;
    object-fit: contain;
    filter: brightness(0) invert(1);
}

.brand-text {
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.04em;
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
    font-weight: 800;
    letter-spacing: -0.01em;
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
    background: #ffffff;
    border-radius: 18px;
    box-shadow: 0 12px 34px rgba(16, 24, 40, 0.2);
    padding: 10px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    width: 240px;
}

.location-option {
    background: #f2f2f7;
    border: none;
    border-radius: 9px;
    padding: 9px 8px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #1c1c1e;
    cursor: pointer;
    transition: background 0.12s ease;
}

.location-option:hover {
    background: #e6e6ec;
}

.location-option.active {
    background: #EF7C00;
    color: #ffffff;
}

.custom-location {
    grid-column: 1 / -1;
    display: flex;
    gap: 6px;
    margin-top: 2px;
}

.custom-location input {
    flex: 1;
    min-width: 0;
    background: #f2f2f7;
    border: 1px solid transparent;
    border-radius: 9px;
    padding: 9px 10px;
    font-size: 0.82rem;
    font-family: inherit;
    color: #1c1c1e;
}

.custom-location input:focus {
    outline: none;
    border-color: #EF7C00;
    background: #ffffff;
}

.custom-location button {
    background: #003D7C;
    color: #ffffff;
    border: none;
    border-radius: 9px;
    padding: 0 14px;
    font-size: 0.8rem;
    font-weight: 700;
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
    font-weight: 800;
    color: #1c1c1e;
    letter-spacing: -0.01em;
}

.field input,
.field textarea,
.field select {
    width: 100%;
    background: #f2f2f7;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 1rem;
    font-family: inherit;
    color: #1c1c1e;
    -webkit-user-select: text;
    user-select: text;
    transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.field input::placeholder,
.field textarea::placeholder {
    color: #b0b0b6;
}

.field input:focus,
.field textarea:focus,
.field select:focus {
    outline: none;
    background: #ffffff;
    border-color: #EF7C00;
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
    color: #8e8e93;
    pointer-events: none;
}

.form-error {
    margin: 0;
    color: #ff3b30;
    font-size: 0.85rem;
}

.submit-btn {
    margin-top: 8px;
    width: 100%;
    background: #003D7C;
    color: #ffffff;
    border: none;
    border-radius: 14px;
    padding: 16px;
    font-size: 1.02rem;
    font-weight: 800;
    letter-spacing: 0.02em;
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
</style>
