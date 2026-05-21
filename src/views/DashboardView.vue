<template>
    <div class="app-screen">

        <div class="view-toggle-wrapper">
            <div class="segmented-control">
                <button class="segment-btn" :class="{ active: viewMode === 'map' }" @click="viewMode = 'map'">
                    Map
                </button>
                <button class="segment-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
                    List
                </button>
            </div>
        </div>

        <div class="content-area">
            <CampusMap v-if="viewMode === 'map'" />
            <RequestList v-else />
        </div>

        <button class="request-btn" @click="router.push('/request')">
            <span class="request-icon">+</span>
            <span>Request</span>
        </button>

        <BottomNav />

    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import CampusMap from '../components/MapView.vue';
import RequestList from '../components/ListView.vue';
import BottomNav from '../components/BottomNav.vue';

const router = useRouter();
const viewMode = ref('map');
</script>

<style scoped>
.app-screen {
    position: relative;
    height: 100dvh;
    width: 100vw;
    overflow: hidden;
}

.view-toggle-wrapper {
    position: absolute;
    top: 24px;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
}

/* 
    Map and List View Switch 
    White text on blue background (Inactive state)
*/
.segmented-control {
    background-color: #003D7C;
    padding: 4px;
    border-radius: 30px;
    display: flex;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    pointer-events: auto;
}

.segment-btn {
    background: transparent;
    border: none;
    color: #FFFFFF;
    padding: 8px 24px;
    border-radius: 26px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

/* 
    Map and List View Buttons 
    Blue text on white background (Active state)
*/

.segment-btn.active {
    background-color: #FFFFFF;
    color: #003D7C;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.content-area {
    height: 100%;
    width: 100%;
}

.request-btn {
    position: fixed;
    bottom: 90px;
    right: 20px;
    background-color: #EF7C00;
    box-shadow: 0 8px 22px rgba(239, 124, 0, 0.45);
    color: white;
    border: none;
    border-radius: 30px;
    padding: 13px 24px;
    font-size: 1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.request-btn:active {
    transform: scale(0.95);
}

.request-icon {
    font-size: 1.4rem;
    line-height: 1;
}
</style>