<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';

import { getSocket } from '../utils/socket';
import { showAchievementToasts } from '../utils/achievementToast';

const toast = useToast();

let socket = null;

const onAchievementsUnlocked = ({ achievements = [] } = {}) => {
    showAchievementToasts(toast, achievements);
};

onMounted(() => {
    socket = getSocket();
    socket?.on('achievements:unlocked', onAchievementsUnlocked);
});

onUnmounted(() => {
    socket?.off('achievements:unlocked', onAchievementsUnlocked);
    socket = null;
});
</script>

<template></template>