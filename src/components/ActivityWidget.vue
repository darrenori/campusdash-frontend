<template>
    <div :class="['surface-card p-4 shadow-2 border-round mb-4 border-left-3', borderColorClass]">
        <h3 :class="['mt-0 mb-3', titleColorClass]">{{ title }}</h3>

        <slot>
            <p class="text-sm text-gray-500 italic m-0">No active items.</p>
        </slot>
    </div>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        required: true
    },
    borderColorClass: {
        type: String,
        default: 'border-primary'
    },
    titleColorClass: {
        type: String,
        default: 'text-primary'
    }
})
</script>