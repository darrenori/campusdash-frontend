<template>
    <div class="map-view">
        <GoogleMap :key="themeStore.isDark ? 'dark-map' : 'light-map'" ref="mapRef" :api-key="apiKey" :map-id="mapId"
            class="google-map" :center="mapCenter" :zoom="16" :disable-default-ui="true" :clickable-icons="false"
            :keyboard-shortcuts="false" :color-scheme="themeStore.isDark ? 'DARK' : 'LIGHT'"
            @click="$emit('map-click')">

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
                <AdvancedMarker v-for="request in requests" :key="request.id" :options="{
                    position: request.deliveryCoords,
                    title: request.deliveryLocation
                }" :pin-options="{
                    background: '#d33a2c',
                    borderColor: '#b91c1c',
                    glyphColor: '#ffffff',
                }" @click="$emit('select-request', request)" />
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
    acceptingId: {
        type: [Number, String],
        default: null
    },
    onlineUserIds: {
        type: Object,
        required: true
    },
    currentUserId: {
        type: [Number, String],
        default: null
    }
});

defineEmits(['select-request', 'map-click']);

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