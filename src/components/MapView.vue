<template>
    <div class="map-wrapper">
        <div class="map-placeholder-content">
            <h2>Campus Map</h2>
            <p>Render Map Here</p>
            <small v-if="requests.length">Live active delivery requests: {{ requests.length }}</small>
        </div>
    </div>
</template>

<script setup>
defineProps({
    requests: { type: Array, required: true },
    myRequest: { type: Object, default: null },
    onlineUserIds: { type: Object, required: true }
});
</script>

<style scoped>
.map-wrapper {
    height: 100%;
    width: 100%;
    background-color: var(--border-color);
    display: flex;
    justify-content: center;
    align-items: center;
}

.map-placeholder-content {
    text-align: center;
    color: var(--text-muted);
}
</style>