<template>
    <Teleport to="body">
        <div v-if="active" class="tour-root" role="dialog" aria-modal="true"
            :aria-label="currentStep?.title || 'Onboarding tour'">

            <svg class="tour-spot-svg" :width="viewport.w" :height="viewport.h"
                :viewBox="`0 0 ${viewport.w} ${viewport.h}`" @click.stop>
                <defs v-if="spot">
                    <mask id="tour-hole">
                        <rect x="0" y="0" :width="viewport.w" :height="viewport.h" fill="white" />
                        <rect class="spot-rect" :x="spot.x" :y="spot.y" :width="spot.w" :height="spot.h" :rx="spot.rx"
                            fill="black" />
                    </mask>
                </defs>

                <rect v-if="spot" class="tour-dim" x="0" y="0" :width="viewport.w" :height="viewport.h"
                    mask="url(#tour-hole)" />
                <rect v-else class="tour-dim" x="0" y="0" :width="viewport.w" :height="viewport.h" />

                <rect v-if="spot" class="spot-ring" :x="spot.x" :y="spot.y" :width="spot.w" :height="spot.h"
                    :rx="spot.rx" fill="none" />
            </svg>

            <Transition name="tour-pop">
                <div v-if="currentStep" :key="stepIndex" class="tour-callout"
                    :class="[`is-${calloutPosition}`, { 'is-center': currentStep.center }]">

                    <button class="tour-close" type="button"
                        :aria-label="currentStep.key === 'welcome' ? 'Skip tour' : 'Close tour'" @click="complete">
                        <i class="pi pi-times"></i>
                    </button>

                    <span v-if="currentStep.section" class="tour-eyebrow">{{ currentStep.section }}</span>
                    <h3 class="tour-title">{{ currentStep.title }}</h3>
                    <p class="tour-desc">{{ currentStep.desc }}</p>

                    <div v-if="currentStep.center" class="tour-actions tour-actions-center">
                        <template v-if="currentStep.key === 'welcome'">
                            <button class="tour-btn tour-btn-primary" type="button" :disabled="busy" @click="next">
                                Take a quick tour
                            </button>
                            <button class="tour-btn tour-btn-text" type="button" :disabled="busy"
                                @click="complete">Skip</button>
                        </template>
                        <button v-else class="tour-btn tour-btn-primary" type="button" :disabled="busy"
                            @click="complete">Let's go!</button>
                    </div>

                    <div v-else class="tour-footer">
                        <div class="tour-dots" aria-hidden="true">
                            <span v-for="(dot, i) in dotCount" :key="i" class="tour-dot"
                                :class="{ active: i === dotIndex }"></span>
                        </div>
                        <div class="tour-actions">
                            <button class="tour-btn tour-btn-ghost" type="button" :disabled="busy" @click="back">Back</button>
                            <button class="tour-btn tour-btn-primary" type="button" :disabled="busy" @click="next">
                                {{ nextLabel }}
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </div>
    </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { completeOnboarding, shouldStartOnboarding } from '../utils/onboarding';

const props = defineProps({
    userId: {
        type: [Number, String],
        default: null,
    },
});

const router = useRouter();

const steps = [
    {
        key: 'welcome',
        route: '/',
        center: true,
        title: 'Welcome to CampusDash \u{1F44B}',
        desc: 'Need something from across campus? Put up a request, or earn points by helping someone else.',
    },
    {
        key: 'view-toggle',
        route: '/',
        anchor: 'view-toggle',
        section: 'Discover',
        title: 'Map or list',
        desc: 'Use the map to see what is nearby, or switch to the list for a quick scan.',
    },
    {
        key: 'request',
        route: '/',
        anchor: 'request',
        section: 'Discover',
        title: 'Make a request',
        desc: 'Need something? Tap Request to tell runners what to pick up and where to bring it.',
    },
    {
        key: 'request-location',
        route: '/request',
        anchor: 'request-location',
        section: 'New request',
        title: 'Choose where to deliver',
        desc: 'First, choose where you want your order delivered.',
    },
    {
        key: 'request-details',
        route: '/request',
        anchor: 'request-details',
        section: 'New request',
        title: 'Tell your runner what to get',
        desc: 'Pick the canteen and stall, then list what you want. Add any notes that will help your runner.',
    },
    {
        key: 'request-submit',
        route: '/request',
        anchor: 'request-submit',
        section: 'New request',
        title: 'Send it out',
        desc: 'Give everything a quick check, then submit your request. Nearby runners will be able to see it.',
    },
    {
        key: 'paynow-upload',
        route: '/profile',
        anchor: 'paynow-upload',
        section: 'Profile setup',
        title: 'Add your PayNow QR',
        desc: 'Add a clear PNG or JPEG of your PayNow QR so payment is easy after a delivery.',
    },
    {
        key: 'notifications',
        route: '/profile',
        anchor: 'notifications',
        section: 'Profile setup',
        title: 'Never miss an update',
        desc: 'Turn on notifications so you know when someone accepts your request or sends a message.',
    },
    {
        key: 'timetable-card',
        route: '/profile',
        anchor: 'timetable-card',
        section: 'Profile setup',
        title: 'Connect your timetable',
        desc: 'Add your NUSMods timetable and CampusDash can work out where you will be next.',
    },
    {
        key: 'timetable-input',
        route: '/timetable',
        anchor: 'timetable-input',
        section: 'NUSMods',
        title: 'Paste your NUSMods share link',
        desc: 'Copy your timetable share link from NUSMods, paste it here, then tap Save.',
    },
    {
        key: 'complete',
        route: '/',
        center: true,
        title: 'You’re ready to dash',
        desc: 'That is it. You can change your timetable or PayNow QR anytime from Profile.',
    },
];

const active = ref(false);
const busy = ref(false);
const stepIndex = ref(0);
const targetRect = ref(null);
const viewport = reactive({ w: window.innerWidth, h: window.innerHeight });

let started = false;
let startTimer = null;
let measureFrame = null;
let observedAnchor = null;
let anchorObserver = null;
let originRoute = null;

const currentStep = computed(() => steps[stepIndex.value] || null);

function clamp(value, min, max) {
    if (max < min) return min;
    return Math.max(min, Math.min(max, value));
}

function anchorEl(step) {
    if (!step || step.center) return null;
    return document.querySelector(`[data-tour="${step.anchor}"]`);
}

function measureAnchor() {
    measureFrame = null;
    if (!active.value || currentStep.value?.center) return;

    const el = anchorEl(currentStep.value);
    targetRect.value = el ? el.getBoundingClientRect() : null;
}

function scheduleAnchorMeasure() {
    if (measureFrame != null) return;
    measureFrame = requestAnimationFrame(measureAnchor);
}

function observeAnchor(el) {
    if (observedAnchor === el) return;
    anchorObserver?.disconnect();
    observedAnchor = el || null;
    if (observedAnchor) anchorObserver?.observe(observedAnchor);
}

async function waitForAnchor(step) {
    for (let attempt = 0; attempt < 30; attempt++) {
        await nextTick();
        const el = anchorEl(step);
        if (el) return el;
        await new Promise((resolveWait) => setTimeout(resolveWait, 50));
    }
    return null;
}

async function showStep(index, direction) {
    if (index >= steps.length) {
        complete();
        return;
    }
    if (index < 0) index = 0;

    const step = steps[index];
    stepIndex.value = index;
    targetRect.value = null;

    if (router.currentRoute.value.path !== step.route) {
        await router.push(step.route);
    }

    if (step.center) {
        observeAnchor(null);
        return;
    }

    const el = await waitForAnchor(step);
    if (!el) {
        const dir = direction === 0 ? 1 : direction;
        await showStep(index + dir, dir);
        return;
    }

    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    await nextTick();
    await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
    observeAnchor(el);
    targetRect.value = el.getBoundingClientRect();
}

async function next() {
    if (busy.value) return;
    busy.value = true;
    try {
        await showStep(stepIndex.value + 1, 1);
    } finally {
        busy.value = false;
    }
}

async function back() {
    if (busy.value) return;
    busy.value = true;
    try {
        await showStep(stepIndex.value - 1, -1);
    } finally {
        busy.value = false;
    }
}

const nextLabel = computed(() => (stepIndex.value === steps.length - 1 ? 'Got it' : 'Next'));

const dotCount = computed(() => steps.filter((s) => !s.center).length);
const dotIndex = computed(() =>
    steps.slice(0, stepIndex.value + 1).filter((step) => !step.center).length - 1
);

const calloutPosition = computed(() => {
    if (!targetRect.value) return 'center';
    return targetRect.value.top + targetRect.value.height / 2 > viewport.h / 2 ? 'top' : 'bottom';
});

const spot = computed(() => {
    if (!targetRect.value) return null;
    const pad = 8;
    const edge = 6;
    const r = targetRect.value;
    const x = clamp(r.left - pad, edge, viewport.w - edge);
    const y = clamp(r.top - pad, edge, viewport.h - edge);
    const w = Math.max(0, Math.min(r.width + pad * 2, viewport.w - x - edge));
    const h = Math.max(0, Math.min(r.height + pad * 2, viewport.h - y - edge));
    const rx = Math.min(18, h / 2);
    return { x, y, w, h, rx };
});

function onResize() {
    viewport.w = window.innerWidth;
    viewport.h = window.innerHeight;
    scheduleAnchorMeasure();
}

function onKeydown(e) {
    if (!active.value) return;
    if (e.key === 'Escape') {
        e.preventDefault();
        complete();
    }
}

async function start() {
    if (!shouldStartOnboarding()) return;
    originRoute = router.currentRoute.value.fullPath;
    active.value = true;
    stepIndex.value = 0;
    targetRect.value = null;
    await showStep(0, 1);
}

async function complete() {
    completeOnboarding();
    active.value = false;
    targetRect.value = null;
    observeAnchor(null);

    const returnTo = originRoute;
    originRoute = null;
    if (returnTo && router.currentRoute.value.fullPath !== returnTo) {
        await router.replace(returnTo);
    }
}

function maybeStart() {
    if (started) return;
    if (!shouldStartOnboarding()) return;
    started = true;
    startTimer = setTimeout(start, 250);
}

watch(() => props.userId, (userId) => {
    if (userId == null) {
        active.value = false;
        started = false;
        originRoute = null;
        return;
    }
    maybeStart();
});

onMounted(() => {
    if ('ResizeObserver' in window) {
        anchorObserver = new ResizeObserver(scheduleAnchorMeasure);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('scroll', scheduleAnchorMeasure, true);
    window.addEventListener('keydown', onKeydown);
    maybeStart();
});

onBeforeUnmount(() => {
    if (startTimer) clearTimeout(startTimer);
    if (measureFrame != null) cancelAnimationFrame(measureFrame);
    anchorObserver?.disconnect();
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('scroll', scheduleAnchorMeasure, true);
    window.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.tour-root {
    position: fixed;
    inset: 0;
    z-index: 3000;
}

.tour-spot-svg {
    position: absolute;
    inset: 0;
    display: block;
}

.tour-dim {
    fill: rgba(0, 0, 0, 0.62);
}

.spot-ring {
    stroke: var(--color-accent);
    stroke-width: 2;
}

.spot-rect,
.spot-ring {
    transition: x 0.3s ease, y 0.3s ease, width 0.3s ease, height 0.3s ease;
}

.tour-callout {
    position: fixed;
    left: 50%;
    width: min(390px, calc(100vw - 24px));
    max-height: calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 32px);
    overflow-y: auto;
    box-sizing: border-box;
    background: var(--bg-surface);
    color: var(--text-main);
    border: 1px solid var(--border-color);
    border-radius: 28px;
    padding: 18px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.4);
    transform: translateX(-50%);
    backdrop-filter: blur(24px) saturate(1.2);
    -webkit-backdrop-filter: blur(24px) saturate(1.2);
}

.tour-callout.is-top {
    top: calc(env(safe-area-inset-top) + 12px);
}

.tour-callout.is-bottom {
    bottom: calc(env(safe-area-inset-bottom) + 12px);
}

.tour-callout.is-center {
    top: 50%;
    bottom: auto;
    left: 50%;
    width: min(340px, calc(100vw - 32px));
    transform: translate(-50%, -50%);
    text-align: center;
    padding: 26px 22px 22px;
}

.tour-close {
    position: absolute;
    top: 12px;
    right: 14px;
    background: transparent;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
}

.tour-title {
    margin: 0 0 6px;
    font-family: 'Montserrat', sans-serif;
    font-size: 0.94rem;
    font-weight: 700;
    color: var(--text-main);
}

.tour-eyebrow {
    display: block;
    margin: 0 28px 5px 0;
    color: var(--color-accent);
    font-family: 'Montserrat', sans-serif;
    font-size: 0.62rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
}

.is-center .tour-title {
    font-size: 1.12rem;
    margin-bottom: 8px;
}

.tour-desc {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    line-height: 1.45;
    color: var(--text-muted);
}

.tour-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 16px;
}

@media (max-width: 370px) {
    .tour-callout {
        padding: 16px;
    }

    .tour-footer {
        align-items: flex-end;
    }

    .tour-dots {
        gap: 4px;
    }

    .tour-btn {
        padding-inline: 14px;
    }
}

.tour-dots {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tour-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border-color);
    transition: background 0.2s ease, width 0.2s ease;
}

.tour-dot.active {
    width: 16px;
    border-radius: 4px;
    background: var(--color-primary);
}

.tour-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tour-actions-center {
    flex-direction: column;
    margin-top: 20px;
}

.tour-btn {
    font-family: 'Montserrat', sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    border-radius: 18px;
    padding: 10px 18px;
    border: none;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
}

.tour-btn:active {
    transform: scale(0.96);
}

.tour-btn:disabled {
    cursor: default;
    opacity: 0.55;
}

.tour-btn-primary {
    background: var(--color-primary);
    color: #ffffff;
}

.tour-actions-center .tour-btn-primary {
    width: 100%;
    padding: 12px 18px;
}

.tour-btn-ghost {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border-color);
}

.tour-btn-text {
    background: transparent;
    color: var(--text-muted);
    padding: 6px 12px;
}

.tour-pop-enter-active {
    transition: opacity 0.28s ease, transform 0.28s ease;
}

.tour-pop-leave-active {
    transition: opacity 0.18s ease;
}

.tour-pop-enter-from {
    opacity: 0;
    transform: translateX(-50%) scale(0.96);
}

.is-center.tour-pop-enter-from,
.tour-pop-enter-from.is-center {
    transform: translate(-50%, -50%) scale(0.96);
}

.tour-pop-leave-to {
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {

    .spot-rect,
    .spot-ring,
    .tour-dot,
    .tour-btn,
    .tour-pop-enter-active,
    .tour-pop-leave-active {
        transition: none !important;
    }

    .tour-pop-enter-from {
        opacity: 1;
        transform: translateX(-50%);
    }

    .is-center.tour-pop-enter-from,
    .tour-pop-enter-from.is-center {
        transform: translate(-50%, -50%);
    }
}
</style>
