<template>
    <div class="map-view">
        <GoogleMap :api-key="apiKey" :map-id="mapId" class="google-map" :center="mapCenter" :zoom="15"
            :disable-default-ui="true" :clickable-icons="false" :keyboard-shortcuts="false" gesture-handling="greedy"
            @click="$emit('map-click')">
            <AdvancedMarker v-for="request in requests" :key="request.id" :options="{
                position: request.deliveryCoords,
                title: request.deliveryLocation
            }" @click="$emit('select-request', request)" />
        </GoogleMap>
    </div>
</template>

<script setup>
import { computed } from 'vue';
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

const defaultCenter = {
    lat: 1.2978101899443413,
    lng: 103.77668086772162
};

const mapCenter = computed(() => {
    return props.myRequest?.deliveryCoords
        || props.requests[0]?.deliveryCoords
        || defaultCenter;
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
</style>