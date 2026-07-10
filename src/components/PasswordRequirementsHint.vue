<template>
    <div class="password-hint" @mouseenter="show" @mouseleave="hide">
        <button
            type="button"
            class="password-hint-btn"
            aria-label="Password requirements"
            @click.stop="show"
            @focus="show"
            @blur="hide"
        >
            <i class="pi pi-info-circle"></i>
        </button>

        <div v-if="isOpen" class="password-hint-tooltip">
            <ul class="password-requirements">
                <li v-for="req in passwordRequirements" :key="req.id" class="password-requirement">
                    <i :class="['pi', req.test(value) ? 'pi-check-circle requirement-met' : 'pi-circle']"></i>
                    <span :class="{ 'requirement-met-text': req.test(value) }">{{ req.label }}</span>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { passwordRequirements } from '../utils/passwordPolicy';

defineProps({
    value: {
        type: String,
        default: '',
    },
});

const isOpen = ref(false);

const show = () => {
    isOpen.value = true;
};

const hide = () => {
    isOpen.value = false;
};

</script>

<style scoped>
.password-hint {
    position: absolute;
    top: 50%;
    right: 2.55rem;
    transform: translateY(-50%);
    z-index: 3;
}

.password-hint-btn {
    width: 1.6rem;
    height: 1.6rem;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #9ca3af;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}

.password-hint-btn:focus-visible {
    outline: 2px solid #EF7C00;
    outline-offset: 2px;
}

.password-hint-tooltip {
    position: absolute;
    top: calc(100% + 0.45rem);
    right: -2.2rem;
    width: min(250px, 72vw);
    padding: 0.75rem;
    border-radius: 8px;
    background: var(--bg-surface, #ffffff);
    color: var(--text-main, #4d4d4d);
}

/* Arrow thing for the tooltip */
.password-hint-tooltip::before {
    content: "";
    position: absolute;
    top: -4px;
    right: 2.6rem;
    width: 10px;
    height: 10px;
    background: var(--bg-surface, #ffffff);
    transform: rotate(45deg);
}

.password-requirements {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    list-style: none;
    margin: 0;
    padding: 0;
}

.password-requirement {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.78rem;
    line-height: 1.2;
}

.password-requirement i {
    color: #9ca3af;
    font-size: 0.85rem;
}

.password-requirement .requirement-met,
.requirement-met-text {
    color: var(--color-success);
}
</style>