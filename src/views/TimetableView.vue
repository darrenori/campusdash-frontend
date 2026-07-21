<template>
    <div class="timetable-screen">
        <header class="tt-topbar">
            <button type="button" class="back-btn" @click="goBack">
                <i class="pi pi-chevron-left"></i>
            </button>
            <h1 class="topbar-title">Timetable</h1>
            <button v-if="timetable" type="button" class="edit-link" data-tour="timetable-input"
                @click="openInput">Edit</button>
            <span v-else class="topbar-spacer"></span>
        </header>

        <div class="tt-content">
            <!-- Next location summary -->
            <section v-if="nextLocation" class="next-summary">
                <span class="summary-label">Next Location</span>
                <div class="summary-main">
                    <span class="summary-venue">{{ nextLocation.venue || nextLocation.venueCode }}</span>
                    <span v-if="nextLocation.ongoing" class="now-pill">Now</span>
                </div>
                <span class="summary-detail">
                    {{ nextLocation.moduleCode }} · {{ lessonLabel(nextLocation.lessonType) }} ·
                    {{ nextLocation.ongoing ? 'until ' + formatLessonTime(nextLocation.endTime)
                        : nextLocation.day + ' ' + formatLessonTime(nextLocation.startTime) }}
                </span>
            </section>

            <!-- URL input (add / edit) -->
            <section v-if="showInput || !timetable" class="input-card" data-tour="timetable-input">
                <p class="input-heading">{{ timetable ? 'Update timetable' : 'Add your timetable' }}</p>
                <p class="input-help">
                    In NUSMods, open your timetable → <strong>Share/Sync</strong> → copy the link and paste it here.
                </p>
                <input v-model.trim="urlInput" class="url-input" type="url" inputmode="url"
                    placeholder="https://nusmods.com/timetable/sem-2/share?..." @keyup.enter="save" />
                <p v-if="errorMsg" class="input-error">{{ errorMsg }}</p>
                <div class="input-actions">
                    <button v-if="timetable" type="button" class="btn ghost" @click="cancelInput">Cancel</button>
                    <button type="button" class="btn solid" :disabled="loading || !urlInput" @click="save">
                        {{ loading ? 'Loading…' : 'Save' }}
                    </button>
                </div>
            </section>

            <template v-if="timetable">
                <div class="meta-row">
                    <span class="meta-text">AY{{ timetable.acadYear }} · Semester {{ timetable.semester }}</span>
                    <button type="button" class="remove-link" @click="remove">Remove</button>
                </div>

                <!-- Day selector -->
                <div class="day-pills">
                    <button v-for="day in daysWithLessons" :key="day" type="button" class="day-pill"
                        :class="{ active: day === selectedDay }" @click="selectedDay = day">
                        {{ day.slice(0, 3) }}
                    </button>
                </div>

                <!-- Day timeline -->
                <div class="day-lessons">
                    <div v-for="(lesson, index) in lessonsForSelectedDay" :key="index" class="lesson-row">
                        <div class="lesson-time">
                            <span class="time-start">{{ formatLessonTime(lesson.startTime) }}</span>
                            <span class="time-end">{{ formatLessonTime(lesson.endTime) }}</span>
                        </div>
                        <div class="lesson-card" :style="lessonStyle(lesson.moduleCode)">
                            <div class="lesson-top">
                                <span class="lesson-module">{{ lesson.moduleCode }}</span>
                                <span class="lesson-type">{{ lessonLabel(lesson.lessonType) }}</span>
                                <span v-if="isNext(lesson)" class="next-tag">Next</span>
                            </div>
                            <span class="lesson-venue">
                                <i class="pi pi-map-marker"></i>{{ lesson.venue || lesson.venueCode || 'TBA' }}
                            </span>
                        </div>
                    </div>

                    <p v-if="!lessonsForSelectedDay.length" class="no-lessons">No classes on this day.</p>
                </div>
            </template>
        </div>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import BottomNav from '../components/BottomNav.vue';
import {
    resolveTimetable,
    computeNextLocation,
    timetableLessons,
    formatLessonTime,
} from '../utils/timetable';

const router = useRouter();
const authStore = useAuthStore();

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const LESSON_LABELS = {
    LEC: 'Lecture', TUT: 'Tutorial', LAB: 'Lab', REC: 'Recitation', SEC: 'Sectional',
    SEM: 'Seminar', WS: 'Workshop', DLEC: 'Design Lecture', PLEC: 'Lecture', PTUT: 'Tutorial',
    TUT2: 'Tutorial', TUT3: 'Tutorial',
};
const lessonLabel = (abbrev) => LESSON_LABELS[abbrev] || abbrev;

const MODULE_COLORS = [
    { bg: 'rgba(0, 101, 201, 0.12)', accent: '#0065C9' },
    { bg: 'rgba(239, 124, 0, 0.14)', accent: '#EF7C00' },
    { bg: 'rgba(14, 159, 110, 0.13)', accent: '#0e9f6e' },
    { bg: 'rgba(130, 42, 118, 0.13)', accent: '#822a76' },
    { bg: 'rgba(211, 58, 44, 0.12)', accent: '#d33a2c' },
    { bg: 'rgba(36, 71, 131, 0.13)', accent: '#244783' },
];

const selectedDay = ref('Monday');

const showInput = ref(false);
const urlInput = ref('');
const loading = ref(false);
const errorMsg = ref('');

const timetable = computed(() => (timetableLessons(authStore.user) ? authStore.user.nusmods_timetable : null));
const nextLocation = computed(() => {
    const lessons = timetableLessons(authStore.user);
    return lessons ? computeNextLocation(lessons) : null;
});

const lessonsByDay = computed(() => {
    const groups = {};
    for (const lesson of timetable.value?.lessons || []) {
        (groups[lesson.day] ||= []).push(lesson);
    }
    for (const day of Object.keys(groups)) {
        groups[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return groups;
});

const daysWithLessons = computed(() =>
    DAY_ORDER.filter((day) => lessonsByDay.value[day]?.length)
);

const lessonsForSelectedDay = computed(() => lessonsByDay.value[selectedDay.value] || []);

//same colour for a module all week so it's easy to eyeball
const moduleColorMap = computed(() => {
    const map = {};
    const codes = [...new Set((timetable.value?.lessons || []).map((l) => l.moduleCode))];
    codes.forEach((code, i) => {
        map[code] = MODULE_COLORS[i % MODULE_COLORS.length];
    });
    return map;
});

const lessonStyle = (moduleCode) => {
    const color = moduleColorMap.value[moduleCode] || MODULE_COLORS[0];
    return { background: color.bg, borderColor: color.accent };
};

const isNext = (lesson) => {
    const next = nextLocation.value;
    return !!next
        && next.moduleCode === lesson.moduleCode
        && next.day === lesson.day
        && next.startTime === lesson.startTime
        && next.lessonType === lesson.lessonType;
};

//land on today if there's class, otherwise the first day that has any
const pickDefaultDay = () => {
    const days = daysWithLessons.value;
    const today = DAY_ORDER[(new Date().getDay() + 6) % 7]; //js has sunday=0, we start at mon
    selectedDay.value = days.includes(today) ? today : (days[0] || 'Monday');
};

//keep the selected day valid as the timetable changes
watch(daysWithLessons, (days) => {
    if (!days.includes(selectedDay.value)) pickDefaultDay();
});

const openInput = () => {
    errorMsg.value = '';
    urlInput.value = '';
    showInput.value = true;
};

const cancelInput = () => {
    showInput.value = false;
    errorMsg.value = '';
};

const save = async () => {
    if (loading.value || !urlInput.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        let locations = [];
        try {
            const res = await apiRequest.get('/locations');
            locations = res.locations || [];
        } catch {
            //coords are optional, venues still resolve without them
        }

        const data = await resolveTimetable(urlInput.value, locations);
        const { user } = await apiRequest.put('/user/timetable', { timetable: data });
        authStore.setLoggedIn(user);
        showInput.value = false;
    } catch (err) {
        errorMsg.value = err.message || 'Could not read that timetable.';
    } finally {
        loading.value = false;
    }
};

const remove = async () => {
    if (loading.value) return;
    loading.value = true;
    errorMsg.value = '';

    try {
        const { user } = await apiRequest.delete('/user/timetable');
        authStore.setLoggedIn(user);
        showInput.value = false;
    } catch (err) {
        errorMsg.value = err.message || 'Could not remove your timetable.';
    } finally {
        loading.value = false;
    }
};

const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/profile');
};

onMounted(pickDefaultDay);
</script>

<style scoped>
.timetable-screen {
    height: 100dvh;
    overflow-y: auto;
    background: var(--bg-main);
    padding-bottom: 90px;
}

.tt-topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    align-items: center;
    padding: 14px 12px;
    background: var(--bg-main);
    border-bottom: 1px solid var(--border-color);
}

.back-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--theme-blue);
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
}

.back-btn:active {
    transform: scale(0.9);
}

.topbar-title {
    margin: 0;
    text-align: center;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-main);
}

.edit-link {
    border: none;
    background: transparent;
    color: var(--color-accent);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
}

.topbar-spacer {
    display: block;
}

.tt-content {
    max-width: 520px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Next location summary */
.next-summary {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 16px 18px;
}

.summary-label {
    font-size: 0.66rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.summary-main {
    display: flex;
    align-items: center;
    gap: 8px;
}

.summary-venue {
    font-family: 'Montserrat', sans-serif;
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--theme-blue);
    line-height: 1.1;
}

.summary-detail {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
}

.now-pill {
    background: var(--color-success);
    color: #ffffff;
    font-size: 0.6rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 10px;
}

/* Input card */
.input-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    padding: 18px;
}

.input-heading {
    margin: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.94rem;
    font-weight: 700;
    color: var(--text-main);
}

.input-help {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--text-muted);
}

.url-input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    padding: 12px 14px;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-main);
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.url-input::placeholder {
    color: var(--text-subtle);
}

.url-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(239, 124, 0, 0.13);
}

.input-error {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-error);
}

.input-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.btn {
    border: none;
    border-radius: 12px;
    padding: 9px 20px;
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.14s ease, opacity 0.14s ease;
}

.btn:active {
    transform: scale(0.97);
}

.btn.ghost {
    background: var(--bg-card);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.btn.solid {
    background: var(--color-accent);
    color: #ffffff;
}

.btn.solid:disabled {
    opacity: 0.55;
    cursor: default;
}

/* Meta row */
.meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
}

.meta-text {
    font-size: 0.76rem;
    font-weight: 600;
    color: var(--text-muted);
}

.remove-link {
    border: none;
    background: transparent;
    color: var(--color-danger);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
}

/* Day pills */
.day-pills {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px;
    scrollbar-width: none;
}

.day-pills::-webkit-scrollbar {
    display: none;
}

.day-pill {
    flex: 1;
    min-width: 52px;
    border: none;
    background: var(--bg-surface);
    color: var(--text-muted);
    border-radius: 14px;
    padding: 10px 8px;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.14s ease, color 0.14s ease;
}

.day-pill.active {
    background: var(--color-primary);
    color: #ffffff;
}

/* Day timeline */
.day-lessons {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.lesson-row {
    display: grid;
    grid-template-columns: 62px 1fr;
    gap: 12px;
    align-items: stretch;
}

.lesson-time {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding-top: 10px;
    gap: 2px;
}

.time-start {
    font-size: 0.78rem;
    font-weight: 800;
    color: var(--text-main);
    white-space: nowrap;
}

.time-end {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-subtle);
    white-space: nowrap;
}

.lesson-card {
    border: 1px solid;
    border-left-width: 4px;
    border-radius: 16px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.lesson-top {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.next-tag {
    margin-left: auto;
    background: var(--color-accent);
    color: #ffffff;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 10px;
}

.lesson-module {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.92rem;
    font-weight: 800;
    color: var(--text-main);
}

.lesson-type {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.03em;
}

.lesson-venue {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-main);
}

.lesson-venue i {
    font-size: 0.78rem;
    color: var(--text-muted);
}

.no-lessons {
    margin: 8px 0;
    text-align: center;
    font-size: 0.82rem;
    color: var(--text-muted);
}
</style>
