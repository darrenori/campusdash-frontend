<template>
    <div class="map-view">
        <GoogleMap :key="themeStore.isDark ? 'dark-map' : 'light-map'" ref="mapRef" :api-key="apiKey" :map-id="mapId"
            class="google-map" :center="mapCenter" :zoom="16" :disable-default-ui="true" :clickable-icons="false"
            :keyboard-shortcuts="false" :color-scheme="themeStore.isDark ? 'DARK' : 'LIGHT'"
            @click="handleMapBackgroundClick">

            <div v-if="!myRequest" class="map-filter-controls">
                <button v-for="option in filterOptions" :key="option.key" type="button" class="map-filter-btn"
                    :class="{ active: filterMode === option.key }"
                    @click.stop="$emit('update-filter-mode', option.key)">
                    <span>{{ option.label }}</span>
                    <span v-if="option.badge != null" class="map-filter-badge">{{ option.badge }}</span>
                </button>
                <span v-if="filterMode === 'next-class' && !locationAvailable" class="map-filter-hint">
                    Waiting for GPS
                </span>
            </div>

            <div v-if="myRequest" class="map-center-controls">
                <button type="button" class="center-location-btn" :class="isBuyer ? 'own-location' : 'other-location'"
                    :disabled="!buyerCurrentLocation" @click.stop="centerOnLocation(buyerCurrentLocation)">
                    {{ isBuyer ? 'You' : 'Buyer' }}
                </button>

                <button type="button" class="center-location-btn" :class="isRunner ? 'own-location' : 'other-location'"
                    :disabled="!runnerCurrentLocation" @click.stop="centerOnLocation(runnerCurrentLocation)">
                    {{ isRunner ? 'You' : 'Runner' }}
                </button>
            </div>

            <div v-if="!myRequest">
                <AdvancedMarker v-for="group in openRequestGroups" :key="group.key" :options="{
                    position: group.deliveryCoords,
                    title: group.title
                }" :pin-options="{
                    background: '#d33a2c',
                    borderColor: '#b91c1c',
                    glyphColor: '#ffffff',
                    glyphText: group.requests.length > 1 ? String(group.requests.length) : undefined,
                }" @click="$emit('select-request', group.requests[0])" />
            </div>

            <div v-else>
                <AdvancedMarker v-if="runnerCurrentLocation"
                    :options="{ position: runnerCurrentLocation, title: 'Runner\'s Location' }">
                    <template #content>
                        <div class="live-location-dot" :class="isRunner ? 'own-location' : 'other-location'">
                        </div>
                    </template>
                </AdvancedMarker>

                <AdvancedMarker v-if="buyerCurrentLocation"
                    :options="{ position: buyerCurrentLocation, title: 'Buyer\'s Location' }">
                    <template #content>
                        <div class="live-location-dot" :class="isBuyer ? 'own-location' : 'other-location'">
                        </div>
                    </template>
                </AdvancedMarker>

                <AdvancedMarker v-if="myRequest.pickupCoords" :options="pickupMarkerOptions" :pin-options="{
                    background: '#f59e0b',
                    borderColor: '#d97706',
                    glyphColor: '#ffffff',
                    glyphText: 'S'
                }" />

                <AdvancedMarker v-if="myRequest.deliveryCoords" :options="deliveryMarkerOptions" :pin-options="{
                    background: '#d33a2c',
                    borderColor: '#b91c1c',
                    glyphColor: '#ffffff',
                    glyphText: 'D'
                }" />
            </div>
        </GoogleMap>
    </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';
import { GoogleMap, AdvancedMarker } from 'vue3-google-map';
import { getSocket } from '../utils/socket';
import { useThemeStore } from '../stores/theme';

const themeStore = useThemeStore();

const props = defineProps({
    requests: {
        type: Array,
        required: true
    },
    myRequest: {
        type: Object,
        default: null
    },
    currentUserId: {
        type: [Number, String],
        default: null
    },
    filterMode: {
        type: String,
        default: 'all'
    },
    filterOptions: {
        type: Array,
        required: true
    },
    locationAvailable: {
        type: Boolean,
        default: false
    },
});

const emit = defineEmits(['select-request', 'update-filter-mode', 'map-background-click']);

function handleMapBackgroundClick() {
    emit('map-background-click');
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

const mapRef = ref(null);
const runnerCurrentLocation = ref(null);
const buyerCurrentLocation = ref(null);

const hasCenteredOnUser = ref(false);

let routePolylines = [];
let geoWatchId = null;
let routeRequestToken = 0;
let routeRetryTimer = null;

const defaultCenter = {
    lat: 1.2978101899443413,
    lng: 103.77668086772162
};

const mapCenter = computed(() => {
    return props.myRequest?.pickupCoords
        || props.myRequest?.deliveryCoords
        || props.requests[0]?.deliveryCoords
        || defaultCenter;
});

function destinationGroupKey(request) {
    if (request.deliveryLocationId) return `location:${request.deliveryLocationId}`;
    if (request.deliveryLocation) return `name:${request.deliveryLocation}`;
    if (request.deliveryCoords) return `coords:${request.deliveryCoords.lat},${request.deliveryCoords.lng}`;
    return `request:${request.id}`;
}

function destinationGroupTitle(group) {
    if (group.requests.length > 1) {
        return `${group.requests.length} orders to ${group.deliveryLocation}`;
    }

    return `${group.requests[0].canteen} to ${group.deliveryLocation}`;
}

const openRequestGroups = computed(() => {
    const groups = new Map();

    props.requests.forEach((request) => {
        const key = destinationGroupKey(request);

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                deliveryCoords: request.deliveryCoords,
                deliveryLocation: request.deliveryLocation,
                requests: [],
            });
        }

        groups.get(key).requests.push(request);
    });

    return Array.from(groups.values()).map((group) => ({
        ...group,
        title: destinationGroupTitle(group),
    }));
});

const pickupMarkerOptions = computed(() => {
    if (!props.myRequest?.pickupCoords) return {};

    return {
        position: props.myRequest.pickupCoords,
        title: `Pickup: ${props.myRequest.stall || props.myRequest.canteen}`
    };
});

const deliveryMarkerOptions = computed(() => {
    if (!props.myRequest?.deliveryCoords) return {};

    return {
        position: props.myRequest.deliveryCoords,
        title: `Delivery: ${props.myRequest.deliveryLocation}`
    };
});

function centerOnUserOnce() {
    if (hasCenteredOnUser.value) return;
    if (!currentUserLocation.value) return;

    const map = mapRef.value?.map;
    if (!map) return;

    map.panTo(currentUserLocation.value);
    map.setZoom(17);

    hasCenteredOnUser.value = true;
}

function centerOnLocation(location) {
    if (!location) return;

    const map = mapRef.value?.map;
    if (!map) return;

    map.panTo(location);
    map.setZoom(17);
}

function trackUserLocation() {
    if (!navigator.geolocation || geoWatchId !== null) return;

    geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
            const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            if (isRunner.value) {
                runnerCurrentLocation.value = location;
            }

            if (isBuyer.value) {
                buyerCurrentLocation.value = location;
            }

            const socket = getSocket();

            socket?.emit('delivery:location', {
                requestId: props.myRequest.id,
                userId: props.currentUserId,
                role: isRunner.value ? 'runner' : 'buyer',
                latitude: location.lat,
                longitude: location.lng
            });

            if (props.myRequest) {
                centerOnUserOnce();

                if (isRunner.value) { // Only Runner should see the route
                    calculateRoute();
                }
            }
        },
        (error) => {
            console.warn('Location access denied or failed.', {
                code: error.code,
                message: error.message
            });
        },
        {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
        }
    );
}

function stopTrackingUserLocation() {
    if (navigator.geolocation && geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
    }

    geoWatchId = null;
    runnerCurrentLocation.value = null;
    buyerCurrentLocation.value = null;
}

const isRunner = computed(() => {
    return String(props.myRequest?.deliverer?.id) === String(props.currentUserId);
});

const isBuyer = computed(() => {
    return String(props.myRequest?.requester?.id) === String(props.currentUserId);
});

function joinRequestRoom() {
    if (!props.myRequest?.id) return;

    const socket = getSocket();

    socket?.emit('request:join', {
        requestId: props.myRequest.id
    });
}

// Buyer/Runner Location
const currentUserLocation = computed(() => {
    if (isRunner.value) return runnerCurrentLocation.value;
    if (isBuyer.value) return buyerCurrentLocation.value;
    return null;
});

function onParticipantLocation(payload) {
    if (!props.myRequest) return;
    if (Number(payload.requestId) !== Number(props.myRequest.id)) return;

    const location = {
        lat: payload.latitude,
        lng: payload.longitude
    };

    const payloadUserId = Number(payload.userId);
    const runnerId = Number(props.myRequest.deliverer?.id);
    const buyerId = Number(props.myRequest.requester?.id);

    if (payload.role === 'runner' || payloadUserId === runnerId) {
        runnerCurrentLocation.value = location;
    }

    if (payload.role === 'buyer' || payloadUserId === buyerId) {
        buyerCurrentLocation.value = location;
    }

    centerOnUserOnce();

    if (isRunner.value) {
        calculateRoute();
    }
}

function listenForParticipantLocation() {
    const socket = getSocket();
    socket?.on('delivery:location', onParticipantLocation);
}

function stopListeningForParticipantLocation() {
    const socket = getSocket();
    socket?.off('delivery:location', onParticipantLocation);
}

function clearRoute() {
    routePolylines.forEach((polyline) => {
        polyline.setMap(null);
    });

    routePolylines = [];
}

function scheduleRouteRetry() {
    if (routeRetryTimer) return;

    routeRetryTimer = setTimeout(() => {
        routeRetryTimer = null;
        calculateRoute();
    }, 250);
}

// Before collection, route to Stall
// After collection, route to Delivery Location
const routeDestination = computed(() => {
    if (!props.myRequest) return null;

    return props.myRequest.collectedAt
        ? props.myRequest.deliveryCoords
        : props.myRequest.pickupCoords;
});

watch(
    () => props.myRequest?.collectedAt,
    () => {
        if (!isRunner.value) return;

        clearRoute();
        calculateRoute();
    }
);

// Route calculation
async function calculateRoute() {
    if (!props.myRequest) {
        clearRoute();
        return;
    }

    if (!runnerCurrentLocation.value) return;
    if (!routeDestination.value) return;

    const googleMaps = window.google?.maps;
    const map = mapRef.value?.map;

    if (!googleMaps || !map) {
        return;
    }

    const requestToken = ++routeRequestToken; // Mark current route request as latest

    try {
        // https://developers.google.com/maps/documentation/javascript/reference/route
        const { Route } = await googleMaps.importLibrary('routes');

        const { routes } = await Route.computeRoutes({
            origin: runnerCurrentLocation.value,
            destination: routeDestination.value,
            travelMode: 'WALKING',
            fields: ['path']
        });

        if (requestToken !== routeRequestToken) return;

        clearRoute();

        if (!routes?.length) {
            console.warn('No route found.');
            return;
        }

        routePolylines = routes[0].createPolylines({
            polylineOptions: {
                strokeColor: '#4285F4',
                strokeOpacity: 1,
                strokeWeight: 5
            }
        });

        routePolylines.forEach((polyline) => {
            polyline.setMap(map);
        });
    } catch (err) {
        console.error('Route computation failed:', err);
        clearRoute();
    }
}

watch(
    () => props.myRequest,
    (request) => {
        hasCenteredOnUser.value = false;
        clearRoute();

        stopTrackingUserLocation();
        stopListeningForParticipantLocation();

        if (!request) {
            runnerCurrentLocation.value = null;
            buyerCurrentLocation.value = null;
            return;
        }

        joinRequestRoom();

        if (isRunner.value || isBuyer.value) {
            trackUserLocation();
            listenForParticipantLocation();
        }
    },
    { immediate: true }
);

onUnmounted(() => {
    stopTrackingUserLocation();
    stopListeningForParticipantLocation();
    clearRoute();
});
</script>

<style scoped>
.map-view {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.google-map {
    width: 100%;
    height: 100%;
}

.live-location-dot {
    width: 18px;
    height: 18px;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    position: relative;
    transform: translate(-50%, -50%);
}

.map-filter-controls {
    position: absolute;
    top: 76px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: calc(100% - 32px);
    overflow-x: auto;
    pointer-events: auto;
    padding: 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid rgba(0, 61, 124, 0.08);
}

.map-filter-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    border-radius: 999px;
    min-height: 34px;
    padding: 8px 14px;
    background: transparent;
    color: var(--theme-blue);
    font-size: 0.78rem;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.16s ease, color 0.16s ease;
}

.map-filter-btn.active {
    background: var(--color-primary);
    color: #ffffff;
}

.map-filter-badge {
    min-width: 18px;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--color-accent);
    color: #ffffff;
    font-size: 0.65rem;
    line-height: 1.55;
    text-align: center;
}

.map-filter-hint {
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(0, 61, 124, 0.08);
    color: var(--text-muted);
    font-size: 0.72rem;
    font-weight: 800;
    white-space: nowrap;
}

.own-location {
    background-color: #4285F4;
}

.other-location {
    background-color: #EF7C00;
}

/* Center Buttons */
.map-center-controls {
    position: absolute;
    top: 74px;
    right: 14px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.center-location-btn {
    border: 2px solid var(--border-color);
    border-radius: 999px;
    padding: 8px 12px;
    color: white;
    font-size: 0.78rem;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    cursor: pointer;
}

.center-location-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
</style>