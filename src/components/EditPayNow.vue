<template>
    <Dialog v-model:visible="isVisible" modal dismissableMask header="PayNow QR"
        :style="{ width: '85vw', maxWidth: '350px' }" :draggable="false">
        <div class="qr-editor-container">
            <button type="button" class="qr-preview" :class="{ 'has-preview': tempQrPreview }" @click="triggerFileInput"
                :disabled="isLoading" aria-label="Choose PayNow QR image">
                <img v-if="tempQrPreview" :src="tempQrPreview" class="preview-img" />
                <div v-else class="placeholder-container">
                    <i class="pi pi-qrcode placeholder-icon"></i>
                    <p class="fallback-text">Click to upload PayNow QR</p>
                    <span class="fallback-hint">PNG or JPEG</span>
                </div>
                <span v-if="tempQrPreview" class="preview-action">
                    <i class="pi pi-camera"></i>
                    Change
                </span>
            </button>

            <p class="filename-text">{{ previewStatusText }}</p>
            <p v-if="imgErrorMsg" class="error-msg">{{ imgErrorMsg }}</p>


            <input type="file" ref="fileInput" accept="image/png, image/jpeg, image/jpg" class="hidden-input"
                @change="handleFileSelect" @click="clearFileInputValue" />

            <div class="qr-actions">
                <button type="button" class="choose-btn" @click="triggerFileInput" :disabled="isLoading">
                    <i class="pi pi-plus"></i> {{ selectedFile ? 'Change' : 'Choose' }}
                </button>
                <button type="button" class="upload-btn" @click="handleQrUpload" :disabled="!selectedFile || isLoading">
                    <i class="pi pi-upload"></i> {{ isLoading ? 'Uploading...' : 'Upload' }}
                </button>
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

import { apiRequest } from '../utils/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const props = defineProps({
    visible: Boolean,
    currentQrUrl: String
});

const emit = defineEmits(['update:visible', 'qr-updated']);

// UI State
const isLoading = ref(false);
const imgErrorMsg = ref('');

const fileInput = ref(null);
const selectedFile = ref(null);
const selectedFileName = ref('');
const tempQrPreview = ref(null);
const selectedPreviewUrl = ref(null);

const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg'];
const maxFileSizeBytes = 5 * 1024 * 1024;

const isVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

watch(() => props.visible, (isOpen) => {
    if (isOpen) {
        resetEditor();
    }
});

const previewStatusText = computed(() => {
    if (selectedFileName.value) return selectedFileName.value;
    if (tempQrPreview.value) return 'Current QR shown. Click the preview to change it.';
    return 'No PayNow QR uploaded yet.';
});

const revokeSelectedPreview = () => {
    if (selectedPreviewUrl.value) {
        URL.revokeObjectURL(selectedPreviewUrl.value);
        selectedPreviewUrl.value = null;
    }
};

const resetSelectedFile = () => {
    revokeSelectedPreview();
    selectedFile.value = null;
    selectedFileName.value = '';
    if (fileInput.value) fileInput.value.value = '';
};

const resetEditor = () => {
    resetSelectedFile();
    tempQrPreview.value = props.currentQrUrl || null;
    imgErrorMsg.value = '';
};

const triggerFileInput = () => {
    if (!isLoading.value) fileInput.value?.click();
};

const clearFileInputValue = (event) => {
    event.target.value = null;
};

const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    imgErrorMsg.value = '';

    if (!allowedImageTypes.includes(file.type)) {
        resetSelectedFile();
        tempQrPreview.value = props.currentQrUrl || null;
        imgErrorMsg.value = 'Please choose a PNG or JPEG PayNow QR image.';
        return;
    }

    if (file.size > maxFileSizeBytes) {
        resetSelectedFile();
        tempQrPreview.value = props.currentQrUrl || null;
        imgErrorMsg.value = 'Please choose an image under 5 MB.';
        return;
    }

    revokeSelectedPreview();
    selectedFile.value = file;
    selectedFileName.value = file.name;
    selectedPreviewUrl.value = URL.createObjectURL(file);
    tempQrPreview.value = selectedPreviewUrl.value;
};

const handleQrUpload = async () => {
    if (!selectedFile.value) return;

    isLoading.value = true;
    imgErrorMsg.value = '';

    try {
        const formData = new FormData();
        formData.append('qr', selectedFile.value);

        const response = await apiRequest.postFormData('/user/upload-qr', formData);

        authStore.setLoggedIn(response.user);

        resetSelectedFile();
        isVisible.value = false;

        toast.add({
            severity: 'success',
            summary: 'PayNow QR Updated!',
            detail: response.message || 'Your PayNow QR has been updated successfully.',
            life: 5000
        });
    } catch (err) {
        imgErrorMsg.value = err.response?.data?.error || err.message || 'Failed to upload PayNow QR.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.qr-editor-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    gap: 14px;
}

.qr-preview {
    width: 200px;
    height: 200px;
    background: var(--bg-input);
    border-radius: 28px;
    border: 2px dashed var(--border-color);
    color: var(--text-main);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 0;
    position: relative;
    transition: border-color 0.2s ease, transform 0.2s ease;
}

.qr-preview:hover:not(:disabled),
.qr-preview:focus-visible {
    border-color: var(--theme-blue);
    transform: translateY(-1px);
    outline: none;
}

.qr-preview:disabled {
    cursor: wait;
    opacity: 0.7;
}

.qr-preview.has-preview {
    border-style: solid;
    background: var(--bg-card);
}

.preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 12px;
}

.placeholder-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    padding: 18px;
}

.placeholder-icon {
    font-size: 2.8rem;
    color: var(--text-subtle);
}

.fallback-text {
    font-size: 0.85rem;
    font-weight: 700;
    text-align: center;
    margin: 0;
}

.fallback-hint {
    color: var(--text-subtle);
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
}

.preview-action {
    align-items: center;
    background: var(--theme-blue);
    border-radius: 14px;
    bottom: 12px;
    color: white;
    display: flex;
    font-size: 0.72rem;
    font-weight: 700;
    gap: 6px;
    left: 50%;
    padding: 7px 12px;
    position: absolute;
    transform: translateX(-50%);
}

.filename-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    line-height: 1.35;
    margin: 0;
    max-width: 260px;
    word-break: break-word;
}

.hidden-input {
    display: none;
}

.qr-actions {
    display: flex;
    gap: 10px;
    width: 100%;
}

.choose-btn,
.upload-btn {
    flex: 1;
    padding: 10px;
    border-radius: 18px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
}

.choose-btn {
    background-color: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-main);
}

.choose-btn:disabled {
    opacity: 0.6;
    cursor: wait;
}

.upload-btn {
    background-color: var(--theme-blue);
    color: white;
    border: none;
}

.upload-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Error Message Styling */
.error-msg {
    font-size: 0.9rem;
    color: var(--color-error);
    margin: 0;
    text-align: center;
}
</style>
