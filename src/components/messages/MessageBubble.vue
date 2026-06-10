<template>
    <div class="bubble-row" :class="{ mine }">
        <div class="bubble" :class="{ 'has-image': !!message.imageUrl }">
            <a
                v-if="imageSrc"
                :href="imageSrc"
                target="_blank"
                rel="noopener noreferrer"
                class="bubble-image-link"
            >
                <img :src="imageSrc" class="bubble-image" alt="Shared image" loading="lazy" />
            </a>
            <!-- Body is rendered via escaped interpolation only — never v-html. -->
            <p v-if="message.body" class="bubble-text">{{ message.body }}</p>
        </div>
        <time class="bubble-time" :datetime="message.createdAt">{{ time }}</time>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { resolveFileUrl } from '../../utils/fileUrl';

const props = defineProps({
    message: { type: Object, required: true },
    mine: { type: Boolean, default: false },
});

const imageSrc = computed(() => resolveFileUrl(props.message.imageUrl));

const time = computed(() => {
    const d = new Date(props.message.createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
});
</script>

<style scoped>
.bubble-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: min(76%, 520px);
    margin: 2px 0;
}

.bubble-row.mine {
    align-self: flex-end;
    align-items: flex-end;
}

.bubble {
    border-radius: 18px 18px 18px 6px;
    padding: 8px 13px;
    background: var(--bubble-bg);
}

[data-theme='light'] .bubble {
    border: 1px solid var(--divider-color);
}

.mine .bubble {
    border-radius: 18px 18px 6px 18px;
}

.bubble.has-image {
    padding: 4px;
    overflow: hidden;
}

.bubble-image-link {
    display: block;
}

.bubble-image {
    display: block;
    max-width: min(260px, 60vw);
    max-height: 320px;
    width: auto;
    height: auto;
    border-radius: 16px;
    object-fit: cover;
}

.has-image .bubble-text {
    padding: 6px 10px 4px;
}

.mine .bubble {
    background: var(--color-primary);
    border: none;
}

.bubble-text {
    margin: 0;
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    line-height: 1.42;
    color: var(--text-main);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
}

.mine .bubble-text {
    color: #fff;
}

.bubble-time {
    font-size: 0.68rem;
    color: var(--text-subtle);
    margin: 3px 6px 0;
}
</style>
