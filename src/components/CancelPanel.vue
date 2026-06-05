<template>
    <div class="cancel-panel">
        <div class="cancel-panel-head">
            <h3>Cancel delivery?</h3>

            <button type="button" class="cancel-close" :disabled="cancelling" @click="closeCancelReason">
                <i class="pi pi-times"></i>
            </button>
        </div>

        <p>Let the other person know what happened.</p>

        <p v-if="needsCancelReason" class="cancel-penalty">
            Since a runner has been matched, you will lose 1 point if you cancel.
        </p>

        <p v-if="cancelError" class="cancel-error">
            {{ cancelError }}
        </p>


        <textarea v-model.trim="cancelReason" rows="3" placeholder="e.g. I can no longer make it in time"
            maxlength="255" @input="cancelReason = cleanRequestText(cancelReason)"></textarea>

        <div class="cancel-actions">
            <button type="button" class="keep-btn" :disabled="cancelling" @click="closeCancelReason">
                Keep Order
            </button>

            <button type="button" class="cancel-btn compact" :disabled="cancelling" @click="cancelOrder">
                {{ cancelling ? 'CANCELLING...' : 'CONFIRM CANCEL' }}
            </button>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    needsCancelReason: {
        type: Boolean,
        required: true
    },
    cancelling: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['cancel', 'close']);

const cancelReason = ref('');
const cancelError = ref('');

function cleanRequestText(value) {
    return value.replace(/[<>\u0000-\u001F\u007F]/g, '').slice(0, 255);
}

function closeCancelReason() {
    cancelReason.value = '';
    cancelError.value = '';
    emit('close');
}

function cancelOrder() {
    if (props.cancelling) return;

    const reason = cancelReason.value.trim();

    if (props.needsCancelReason && !reason) {
        cancelError.value = 'Please add a reason before cancelling.';
        return;
    }

    cancelError.value = '';

    emit('cancel', {
        reason: props.needsCancelReason ? reason : null
    });
}
</script>

<style scoped>
.cancel-panel {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 18px;
    padding: 16px;
    display: grid;
    gap: 10px;
    box-shadow: 0 8px 22px rgba(16, 24, 40, 0.08);
}

.cancel-panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.cancel-panel h3 {
    margin: 0;
    color: var(--text-main);
    font-size: 1rem;
    font-weight: 900;
}

.cancel-panel p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.35;
}

.cancel-penalty {
    color: var(--color-danger) !important;
}

.cancel-error {
    color: var(--color-danger) !important;
    background: rgba(211, 58, 44, 0.1);
    border: 1px solid rgba(211, 58, 44, 0.2);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: 0.8rem;
    font-weight: 700;
}

.cancel-panel textarea {
    width: 100%;
    resize: none;
    border: 1px solid transparent;
    border-radius: 14px;
    padding: 12px 14px;
    background: var(--bg-card);
    color: var(--text-main);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.35;
}

.cancel-panel textarea:focus {
    outline: none;
    border-color: var(--color-danger);
    box-shadow: 0 0 0 4px rgba(211, 58, 44, 0.12);
}

.cancel-close {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 50%;
    background: var(--bg-card);
    color: var(--text-muted);
    cursor: pointer;
}

.cancel-actions {
    display: grid;
    grid-template-columns: 1fr 1.25fr;
    gap: 10px;
}

.keep-btn {
    border: none;
    border-radius: 14px;
    padding: 12px 10px;
    background: var(--bubble-bg);
    color: var(--text-main);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 800;
    cursor: pointer;
}

.cancel-btn {
    border: none;
    border-radius: 14px;
    color: #ffffff;
    font-family: inherit;
    font-weight: 800;
    cursor: pointer;
    width: 100%;
    background: var(--color-danger);
    padding: 18px 16px;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
    box-shadow: 0 8px 18px rgba(211, 58, 44, 0.18);
}

.cancel-btn.compact {
    padding: 12px 10px;
    font-size: 0.78rem;
}

.cancel-btn:disabled,
.keep-btn:disabled,
.cancel-close:disabled {
    opacity: 0.6;
    cursor: default;
}
</style>