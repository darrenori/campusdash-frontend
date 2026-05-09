<template>
    <div class="list-view-container">
        <div class="list-header">
            <h2>Nearby Requests</h2>
        </div>

        <DeliveryRequestCard />
        <DeliveryRequestCard />
        <DeliveryRequestCard />
        <DeliveryRequestCard />

        <div class="bottom-spacer"></div>
    </div>
</template>

<script setup>
import DeliveryRequestCard from './DeliveryRequestCard.vue'
</script>

<style scoped>
.list-view-container {
    height: 100%;
    width: 100%;
    overflow-y: auto;
    padding: 80px 20px 0;
}

.list-header {
    margin-bottom: 16px;
}

.list-header h2 {
    margin: 0 0 4px 0;
    font-size: 1.5rem;
    color: var(--text-main);
}

.bottom-spacer {
    height: 120px;
}
</style>