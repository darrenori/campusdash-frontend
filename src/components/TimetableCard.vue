<template>
    <button type="button" class="timetable-tile" data-tour="timetable-card" @click="router.push('/timetable')">
        <div class="tile-icon">
            <i class="pi pi-map-marker"></i>
        </div>

        <div class="tile-body">
            <span class="tile-label">Next Location</span>

            <template v-if="nextLocation">
                <span class="tile-venue">{{ nextLocation.venue || nextLocation.venueCode || 'Unknown venue' }}</span>
                <span class="tile-detail">
                    {{ nextLocation.moduleCode }} ·
                    {{ nextLocation.ongoing ? 'now until ' + formatLessonTime(nextLocation.endTime)
                        : nextLocation.day + ' ' + formatLessonTime(nextLocation.startTime) }}
                </span>
            </template>

            <span v-else-if="hasTimetable" class="tile-detail">No upcoming classes</span>
            <span v-else class="tile-detail">Add your NUSMods timetable</span>
        </div>

        <span v-if="nextLocation?.ongoing" class="now-pill">Now</span>
        <i class="pi pi-chevron-right tile-chevron"></i>
    </button>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { timetableLessons, computeNextLocation, formatLessonTime } from '../utils/timetable';

const router = useRouter();
const authStore = useAuthStore();

const hasTimetable = computed(() => !!timetableLessons(authStore.user));
const nextLocation = computed(() => {
    const lessons = timetableLessons(authStore.user);
    return lessons ? computeNextLocation(lessons) : null;
});
</script>

<style scoped>
.timetable-tile {
    width: 100%;
    max-width: 500px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 14px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 28px;
    padding: 16px 18px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: transform 0.14s ease, background 0.14s ease;
}

.timetable-tile:active {
    transform: scale(0.985);
    background: var(--bg-card);
}

.tile-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: rgba(239, 124, 0, 0.14);
    display: flex;
    align-items: center;
    justify-content: center;
}

.tile-icon i {
    font-size: 1.1rem;
    color: var(--color-accent);
}

.tile-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tile-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.tile-venue {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.05rem;
    font-weight: 800;
    color: var(--theme-blue);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tile-detail {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.now-pill {
    flex-shrink: 0;
    background: var(--color-success);
    color: #ffffff;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 10px;
}

.tile-chevron {
    flex-shrink: 0;
    font-size: 0.85rem;
    color: var(--text-subtle);
}
</style>
