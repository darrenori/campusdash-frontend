<template>
    <form class="composer" @submit.prevent="submit">
        <input
            ref="fileEl"
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            class="sr-only"
            @change="onFileSelected"
        />

        <!-- Selected image preview: confirm by pressing send, or remove it. -->
        <div v-if="pendingImage" class="image-preview">
            <img :src="pendingImage.url" class="preview-thumb" alt="Selected image preview" />
            <button type="button" class="remove-preview" aria-label="Remove image" @click="clearPending">
                <i class="pi pi-times"></i>
            </button>
        </div>

        <div class="composer-row">
            <button
                type="button"
                class="attach-btn"
                :disabled="disabled || busy"
                aria-label="Upload picture"
                @click="fileEl?.click()"
            >
                <i class="pi pi-image"></i>
            </button>

            <label class="sr-only" :for="inputId">Message</label>
            <textarea
                :id="inputId"
                ref="inputEl"
                v-model="draft"
                class="composer-input"
                :maxlength="MAX_LENGTH"
                rows="1"
                :placeholder="pendingImage ? 'Add a caption…' : 'Message'"
                :disabled="disabled"
                aria-label="Message text"
                @keydown="onKeydown"
                @input="onInput"
            ></textarea>

            <span v-if="nearLimit" class="char-count" aria-live="polite">
                {{ remaining }}
            </span>

            <button
                type="submit"
                class="send-btn"
                :disabled="!canSend"
                :aria-disabled="!canSend"
                :aria-label="pendingImage ? 'Send photo' : 'Send message'"
                :title="pendingImage ? 'Send photo' : 'Send message'"
            >
                <i v-if="busy" class="pi pi-spin pi-spinner"></i>
                <i v-else class="pi pi-send"></i>
            </button>
        </div>
    </form>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';
import { useMessagesStore } from '../../stores/messages';

const props = defineProps({
    conversationId: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
});

const MAX_LENGTH = 2000;
const TYPING_THROTTLE = 1500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const store = useMessagesStore();
const draft = ref('');
const sending = ref(false);
const uploading = ref(false);
const inputEl = ref(null);
const fileEl = ref(null);
const pendingImage = ref(null); // { file, url }
const inputId = `composer-${props.conversationId}`;

let lastTypingAt = 0;

const busy = computed(() => sending.value || uploading.value);
const trimmed = computed(() => draft.value.trim());
const remaining = computed(() => MAX_LENGTH - draft.value.length);
const nearLimit = computed(() => draft.value.length > MAX_LENGTH - 200);
const canSend = computed(
    () => (trimmed.value.length > 0 || !!pendingImage.value) && !busy.value && !props.disabled
);

function autoGrow() {
    const el = inputEl.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
}

function onInput() {
    autoGrow();
    const now = Date.now();
    if (now - lastTypingAt > TYPING_THROTTLE && trimmed.value) {
        lastTypingAt = now;
        store.sendTyping(props.conversationId);
    }
}

function onKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
    }
}

// Stage the chosen image for confirmation instead of uploading immediately.
function onFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || busy.value) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        store.lastError = 'Only JPG and PNG images are allowed.';
        return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
        store.lastError = 'Image must be 5MB or smaller.';
        return;
    }

    clearPending();
    pendingImage.value = { file, url: URL.createObjectURL(file) };
}

function clearPending() {
    if (pendingImage.value) {
        URL.revokeObjectURL(pendingImage.value.url);
        pendingImage.value = null;
    }
}

async function submit() {
    if (!canSend.value) return;
    store.sendStopTyping(props.conversationId);

    if (pendingImage.value) {
        const { file } = pendingImage.value;
        const caption = trimmed.value;
        uploading.value = true;
        try {
            await store.sendImage(props.conversationId, file, caption);
            clearPending();
            draft.value = '';
            await nextTick();
            autoGrow();
            inputEl.value?.focus();
        } catch (err) {
            store.lastError = err.message; // keep the preview so the user can retry
        } finally {
            uploading.value = false;
        }
        return;
    }

    const body = trimmed.value;
    sending.value = true;
    try {
        await store.sendMessage(props.conversationId, body);
        draft.value = '';
        await nextTick();
        autoGrow();
        inputEl.value?.focus();
    } catch (err) {
        store.lastError = err.message;
    } finally {
        sending.value = false;
    }
}

onBeforeUnmount(clearPending);
</script>

<style scoped>
.composer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px 14px;
    border-top: 1px solid var(--border-color);
    background: var(--bg-surface);
}

.composer-row {
    display: flex;
    align-items: flex-end;
    gap: 10px;
}

/* Image preview / confirm bar */
.image-preview {
    position: relative;
    align-self: flex-start;
}

.preview-thumb {
    display: block;
    width: 72px;
    height: 72px;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid var(--border-color);
}

.remove-preview {
    position: absolute;
    top: -8px;
    right: -8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border-color);
    background: var(--bg-surface);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.68rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.remove-preview:hover {
    color: var(--color-error);
}

.remove-preview:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.attach-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.15rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.attach-btn:hover:not(:disabled) {
    background: var(--bg-input);
    color: var(--text-main);
}

.attach-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.25);
}

.attach-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.composer-input {
    flex: 1;
    resize: none;
    border: 1px solid var(--border-color);
    background: var(--bg-input);
    color: var(--text-main);
    border-radius: 22px;
    padding: 11px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 0.92rem;
    line-height: 1.4;
    max-height: 120px;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.composer-input::placeholder {
    color: var(--text-subtle);
}

.composer-input:focus {
    outline: none;
    border-color: var(--theme-blue);
    box-shadow: 0 0 0 3px rgba(0, 101, 201, 0.18);
}

.composer-input:disabled {
    opacity: 0.6;
}

.char-count {
    align-self: center;
    font-size: 0.72rem;
    color: var(--text-subtle);
    min-width: 32px;
    text-align: right;
}

.send-btn {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: var(--color-accent);
    color: #fff;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.15s ease, background 0.15s ease;
}

.send-btn:hover:not(:disabled) {
    opacity: 0.9;
}

.send-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(239, 124, 0, 0.35);
}

.send-btn:disabled {
    background: var(--text-subtle);
    opacity: 0.55;
    cursor: not-allowed;
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}
</style>
