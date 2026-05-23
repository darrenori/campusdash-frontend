<template>
    <Dialog v-model:visible="isVisible" modal dismissableMask header="PayNow QR"
        :style="{ width: '85vw', maxWidth: '350px' }" :draggable="false">
        <div class="qr-editor-container">
            <div class="qr-preview">
                <img v-if="tempQrPreview" :src="tempQrPreview" class="preview-img" />
                <div v-else class="placeholder-container">
                    <i class="pi pi-images placeholder-icon"></i>
                    <p class="fallback-text">No PayNow QR Uploaded</p>
                </div>
            </div>

            <p class="filename-text">{{ selectedFileName || 'No new file selected' }}</p>
            <p v-if="imgErrorMsg" class="error-msg">{{ imgErrorMsg }}</p>


            <input type="file" ref="fileInput" accept="image/png, image/jpeg, image/jpg" class="hidden-input"
                @change="handleFileSelect" />

            <div class="qr-actions">
                <button type="button" class="choose-btn" @click="triggerFileInput">
                    <i class="pi pi-plus"></i> Choose
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

const isVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

watch(() => props.visible, (isOpen) => {
    if (isOpen) {
        tempQrPreview.value = props.currentQrUrl || null;
        selectedFile.value = null;
        selectedFileName.value = '';
        imgErrorMsg.value = '';
    }
});

const triggerFileInput = () => fileInput.value.click();

const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile.value = file;
        selectedFileName.value = file.name;
        tempQrPreview.value = URL.createObjectURL(file);
    }
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

        selectedFile.value = null;
        selectedFileName.value = '';
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
    gap: 15px;
}

.qr-preview {
    width: 200px;
    height: 200px;
    background-color: var(--bg-main);
    border-radius: 16px;
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.placeholder-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
}

.placeholder-icon {
    font-size: 2.5rem;
    color: #ccc;
    opacity: 0.6;
}

.fallback-text {
    font-size: 0.85rem;
    text-align: center;
    margin: 0;
}

.filename-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
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
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
}

.choose-btn {
    background-color: var(--bg-main);
    border: 1px solid var(--border-color);
    color: var(--text-main);
}

.upload-btn {
    background-color: #003D7C;
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
    color: red;
    margin-top: 0;
}
</style>