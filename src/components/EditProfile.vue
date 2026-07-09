<template>
    <div class="editor-container">
        <!-- Profile Picture Edit Button -->
        <div class="pfp-edit-container" @click="showPfpEditor = true">
            <div class="pfp-wrapper">
                <img v-if="pfpPreview" :src="pfpPreview" class="pfp-img" />
                <i v-else class="pi pi-user default-pfp"></i>
            </div>
            <div class="edit-badge">
                <i class="pi pi-pencil"></i>
            </div>
        </div>

        <!-- Form Section -->
        <form @submit.prevent="handleUpdateProfile" class="update-form">
            <div class="input-group">
                <label>Username<span class="required">*</span></label>
                <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText v-model="form.username" placeholder="Username" class="input-field" required
                        autocomplete="username" maxlength="20" />
                </IconField>
            </div>

            <div class="input-group">
                <label>Email</label>
                <IconField>
                    <InputIcon class="pi pi-envelope" />
                    <InputText v-model="form.email" type="email" placeholder="Email" class="input-field"
                        autocomplete="email" disabled />
                </IconField>
            </div>

            <div class="input-group">
                <label>Current Password<span class="required">*</span></label>
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <Password v-model="form.currentPassword" placeholder="Current Password" class="input-field"
                        :feedback="false" fluid toggleMask :inputProps="{ required: true }" />
                </IconField>
                <span class="required-text"><span class="required">*</span> Required</span>
            </div>

            <div class="input-group">
                <label>New Password</label>
                <IconField>
                    <InputIcon class="pi pi-lock" />
                    <Password v-model="form.newPassword" placeholder="New Password" class="input-field"
                        :feedback="false" fluid toggleMask />
                </IconField>
            </div>

            <div class="input-group">
                <label>Confirm Password</label>
                <IconField>
                    <InputIcon class="pi pi-key" />
                    <Password v-model="form.confirmPassword" placeholder="Confirm Password" class="input-field"
                        :feedback="false" fluid toggleMask />
                </IconField>
            </div>

            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

            <div class="form-actions">
                <button type="button" class="back-btn" @click="isVisible = false">Back</button>
                <button type="submit" class="update-btn" :disabled="isSubmitDisabled">
                    {{ isLoading ? 'Updating...' : 'Update' }}
                </button>
            </div>
        </form>
    </div>

    <Dialog v-model:visible="showPfpEditor" modal dismissableMask header="Profile Picture"
        :style="{ width: '85vw', maxWidth: '350px' }" :draggable="false">
        <div class="pfp-editor-container">
            <div class="pfp-preview">
                <img v-if="tempPfpPreview" :src="tempPfpPreview" class="preview-img" />
                <i v-else class="pi pi-user placeholder-icon"></i>
            </div>

            <p class="filename-text">{{ selectedFileName || 'No new file selected' }}</p>
            <p v-if="imgErrorMsg" class="error-msg">{{ imgErrorMsg }}</p>

            <input type="file" ref="fileInput" accept="image/jpg, image/jpeg, image/png" class="hidden-input"
                @change="handleFileSelect" />

            <div class="pfp-actions">
                <button type="button" class="choose-btn" @click="triggerFileInput">
                    <i class="pi pi-plus"></i> Choose
                </button>
                <button type="button" class="upload-btn" @click="handlePfpUpload"
                    :disabled="!selectedFile || isLoading">
                    <i class="pi pi-upload"></i> Upload
                </button>
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

import Dialog from 'primevue/dialog';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

import { apiRequest } from '../utils/api';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const props = defineProps({
    visible: Boolean,
    userData: Object
});

const emit = defineEmits(['update:visible']);

const form = ref({
    username: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
});

const isLoading = ref(false);
const errorMsg = ref('');
const imgErrorMsg = ref('');

const isSubmitDisabled = computed(() => {
    // Check that the required fields are not empty before allowing form submission
    if (!form.value.username.trim() || !form.value.currentPassword || isLoading.value) return true;

    // Check that the password and confirm password fields match before allowing form submission
    return form.value.newPassword !== form.value.confirmPassword;
});

// Display error if passwords do not match
watch(
    () => [form.value.newPassword, form.value.confirmPassword],
    ([newPass, confirmPass]) => {
        if (confirmPass && newPass !== confirmPass) {
            errorMsg.value = 'Passwords do not match.';
        } else {
            errorMsg.value = '';
        }
    }
);

// Profile Picture Editor State
const showPfpEditor = ref(false);
const fileInput = ref(null);
const selectedFile = ref(null);
const selectedFileName = ref('');
const pfpPreview = ref(null);
const tempPfpPreview = ref(null);

const isVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

watch(() => props.userData, (newData) => {
    if (newData) {
        form.value.username = newData.username || '';
        form.value.email = newData.email || '';
        pfpPreview.value = newData.pfpUrl || null;
        tempPfpPreview.value = newData.pfpUrl || null;
    }
}, { immediate: true, deep: true });


// Profile Picture Editor
const triggerFileInput = () => fileInput.value.click();

const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        selectedFile.value = file;
        selectedFileName.value = file.name;
        tempPfpPreview.value = URL.createObjectURL(file);
    }
};

const handlePfpUpload = async () => {
    if (!selectedFile.value) return;

    isLoading.value = true;
    imgErrorMsg.value = '';

    try {
        const formData = new FormData();
        formData.append('pfp', selectedFile.value);

        const response = await apiRequest.postFormData('/user/upload-pfp', formData);

        authStore.setLoggedIn(response.user);

        selectedFile.value = null;
        selectedFileName.value = '';
        showPfpEditor.value = false;

        toast.add({
            severity: 'success',
            summary: 'Profile Picture Updated!',
            detail: response.message || 'Your profile picture has been updated successfully.',
            life: 5000
        });
    } catch (err) {
        imgErrorMsg.value = err.response?.data?.error || err.message || 'Failed to upload profile picture.';
    } finally {
        isLoading.value = false;
    }
};

// Profile Text Update
const handleUpdateProfile = async () => {
    if (isSubmitDisabled.value) return;

    if (form.value.username.length > 20) {
        errorMsg.value = 'Username cannot exceed 20 characters.';
        return;
    }

    isLoading.value = true;
    errorMsg.value = '';

    try {
        const payload = {
            username: form.value.username.trim(),
            currentPassword: form.value.currentPassword
        };

        // The newPassword field should only be included in the payload if it is not empty
        if (form.value.newPassword && form.value.newPassword.trim() !== '') {
            payload.newPassword = form.value.newPassword;
        }

        const response = await apiRequest.put('/user/update-profile', payload, { autoLogout: false });

        // Update Pinia store and LocalStorage with updated user data
        authStore.setLoggedIn(response.user);

        form.value.currentPassword = '';
        form.value.newPassword = '';
        form.value.confirmPassword = '';

        toast.add({
            severity: 'success',
            summary: 'Profile Updated!',
            detail: response.message || 'Your profile has been updated successfully.',
            life: 5000
        });
    } catch (err) {
        errorMsg.value = err.response?.data?.error || err.message || 'Failed to update profile.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.editor-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 0 20px;
}

/* Profile Picture Edit Button */
.pfp-editor-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 0;
    gap: 15px;
}

.pfp-edit-container {
    position: relative;
    cursor: pointer;
    margin-bottom: 20px;
}

.pfp-wrapper {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: #ffffff;
    border: 3px solid var(--theme-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: border-color 0.3s ease;
}

.pfp-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.default-pfp {
    font-size: 2.5rem;
    color: var(--theme-blue);
}

.edit-badge {
    position: absolute;
    bottom: 0;
    right: 0;
    background-color: var(--theme-blue);
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
}

/* Form Styling */
.update-form {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    /* PrimeVue Theming Overrides */
    --p-iconfield-icon-color: #888888;
    --p-inputtext-background: var(--bg-surface);
    --p-inputtext-color: var(--text-main);
    --p-inputtext-placeholder-color: #888888;
    --p-inputtext-border-color: var(--border-color);
    --p-inputtext-focus-border-color: #EF7C00;
}

.input-group label {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.required {
    color: red;
    margin-left: 2px;
}

.required-text {
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.7;
}

.input-field {
    height: 3rem;
    width: 100%;
}

.form-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 15px;
}

.back-btn,
.update-btn {
    border: none;
    border-radius: 10px;
    padding: 10px 25px;
    font-weight: bold;
    cursor: pointer;
    color: white;
}

.back-btn {
    background-color: #EF7C00;
}

.update-btn {
    background-color: #003D7C;
}

.update-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

/* Error Message Styling */
.error-msg {
    font-size: 0.9rem;
    color: red;
    margin-top: 0;
}

/* Profile Picture Editor */
.pfp-preview {
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
    object-fit: cover;
}

.placeholder-icon {
    font-size: 3.5rem;
    color: #ccc;
    opacity: 0.6;
}

.filename-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
}

.hidden-input {
    display: none;
}

.pfp-actions {
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
</style>