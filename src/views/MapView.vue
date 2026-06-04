<template>
    <div class="map-view">
        <GoogleMap ref="mapRef" :api-key="apiKey" :map-id="mapId" class="google-map" :center="mapCenter" :zoom="16"
            :disable-default-ui="true" :clickable-icons="false" :keyboard-shortcuts="false" @click="$emit('map-click')">
            <AdvancedMarker v-for="request in requests" v-if="!myRequest" :key="request.id" :options="{
                position: request.deliveryCoords,
                title: request.deliveryLocation
            }" :pin-options="{
                background: '#d33a2c',
                borderColor: '#b91c1c',
                glyphColor: '#ffffff'
            }" @click="$emit('select-request', request)" />

            <AdvancedMarker v-if="currentLocation" :options="{
                position: currentLocation,
                title: 'My Location'
            }">
                <template #content>
                    <div class="live-location-dot"></div>
                </template>
            </AdvancedMarker>

            <AdvancedMarker v-if="myRequest?.pickupCoords" :options="pickupMarkerOptions" :pin-options="{
                background: '#f59e0b',
                borderColor: '#d97706',
                glyphColor: '#ffffff',
                glyphText: 'S'
            }" />

            <AdvancedMarker v-if="myRequest?.deliveryCoords" :options="deliveryMarkerOptions" :pin-options="{
                background: '#d33a2c',
                borderColor: '#b91c1c',
                glyphColor: '#ffffff',
                glyphText: 'D'
            }" />
        </GoogleMap>
    </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { GoogleMap, AdvancedMarker } from 'vue3-google-map';

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
    }
});

defineEmits(['select-request', 'map-click']);

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

const mapRef = ref(null);
const currentLocation = ref(null);
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
    if (!currentLocation.value) return;

    const map = mapRef.value?.map;
    if (!map) return;

    map.panTo(currentLocation.value);
    map.setZoom(17);

    hasCenteredOnUser.value = true;
}

function trackUserLocation() {
    if (!navigator.geolocation || geoWatchId !== null) return;

    geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
            currentLocation.value = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            if (props.myRequest) {
                centerOnUserOnce();
                calculateRoute();
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
    currentLocation.value = null;
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

async function calculateRoute() {
    if (!props.myRequest) {
        clearRoute();
        return;
    }

    if (!currentLocation.value) return;
    if (!props.myRequest.pickupCoords || !props.myRequest.deliveryCoords) return;

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
            origin: currentLocation.value,
            destination: props.myRequest.deliveryCoords,
            intermediates: [
                {
                    location: props.myRequest.pickupCoords
                }
            ],
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
        if (request) {
            hasCenteredOnUser.value = false;
            trackUserLocation();
            calculateRoute();
        } else {
            hasCenteredOnUser.value = false;
            stopTrackingUserLocation();
            clearRoute();
        }
    },
    { immediate: true }
);

watch(
    () => [
        props.myRequest?.id,
        props.myRequest?.pickupCoords?.lat,
        props.myRequest?.pickupCoords?.lng,
        props.myRequest?.deliveryCoords?.lat,
        props.myRequest?.deliveryCoords?.lng
    ],
    () => {
        if (props.myRequest) {
            hasCenteredOnUser.value = false;
            clearRoute();
            calculateRoute();
        }
    }
);

onMounted(() => {
    if (props.myRequest) {
        trackUserLocation();
        calculateRoute();
    }
});

onUnmounted(() => {
    stopTrackingUserLocation();
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
    background-color: #4285F4;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    position: relative;
    transform: translate(-50%, -50%);
}
</style>