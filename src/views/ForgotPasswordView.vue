<template>
    <div class="forgot-password-screen">
        <img src="../assets/top-waves-1.svg" alt="" class="top-waves" />
        <img src="../assets/bottom-waves-1.svg" alt="" class="bottom-waves" />

        <div class="content-wrapper">
            <div class="logo-container">
                <img src="../assets/logos/logo-full.svg" alt="CampusDash Logo" class="cd-logo" />
            </div>

            <!-- Email Submission -->
            <div v-if="currentStep === 1" class="step-container">
                <div class="instruction-container">
                    <h2>Forgot Password?</h2>
                    <p>Enter your email address below, and we'll send you a 6-digit verification code.</p>
                </div>

                <form class="forgot-password-form" @submit.prevent="handleEmailSubmit">
                    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

                    <div class="input-container">
                        <IconField>
                            <InputIcon class="pi pi-envelope" />
                            <InputText v-model="email" placeholder="Email Address" class="input-field" type="email"
                                autocomplete="email" :disabled="isLoading" />
                        </IconField>
                    </div>

                    <div class="btn-container">
                        <button type="submit" class="submit-btn" :disabled="!email.trim() || isLoading">
                            {{ isLoading ? 'Sending...' : 'Send Verification Code' }}
                        </button>
                        <RouterLink to="/login" class="back-btn">Back to Login</RouterLink>
                    </div>
                </form>
            </div>

            <!-- OTP Verification -->
            <div v-else-if="currentStep === 2" class="step-container">
                <div class="instruction-container">
                    <h2>Verify Your Identity</h2>
                    <p>We sent a 6-digit code to <strong>{{ email }}</strong>. Enter it below to proceed.</p>
                </div>

                <form class="forgot-password-form" @submit.prevent="handleOtpSubmit">
                    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

                    <div class="input-container otp-wrapper">
                        <InputOtp v-model="otp" :length="6" integerOnly class="otp-input" :disabled="isLoading" />
                    </div>

                    <div class="btn-container">
                        <button type="submit" class="submit-btn" :disabled="otp.length !== 6 || isLoading">
                            Verify Code
                        </button>
                        <button type="button" class="back-btn" @click="currentStep = 1" :disabled="isLoading">
                            Back
                        </button>
                    </div>
                </form>
            </div>

            <!-- New Password Creation -->
            <div v-else-if="currentStep === 3" class="step-container">
                <div class="instruction-container">
                    <h2>Create New Password</h2>
                    <p>Choose a new password for your account.</p>
                </div>

                <form class="forgot-password-form" @submit.prevent="handlePasswordReset">
                    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

                    <div class="input-container">
                        <IconField>
                            <InputIcon class="pi pi-lock" />
                            <Password v-model="password" placeholder="New Password" class="input-field"
                                :feedback="false" fluid toggleMask :inputProps="{ autocomplete: 'new-password' }"
                                :disabled="isLoading" />
                        </IconField>

                        <IconField>
                            <InputIcon class="pi pi-key" />
                            <Password v-model="confirmPassword" placeholder="Confirm New Password" class="input-field"
                                :feedback="false" fluid toggleMask :inputProps="{ autocomplete: 'new-password' }"
                                :disabled="isLoading" />
                        </IconField>
                    </div>

                    <div class="btn-container">
                        <button type="submit" class="submit-btn" :disabled="isResetDisabled">
                            {{ isLoading ? 'Updating Password...' : 'Update Password' }}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../utils/api';

const router = useRouter();

// Import PrimeVue components
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import InputOtp from 'primevue/inputotp';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Step Tracker (1: Email, 2: OTP, 3: New Password)
const currentStep = ref(1);

// Form fields
const email = ref('');
const otp = ref('');
const password = ref('');
const confirmPassword = ref('');

// UI State
const isLoading = ref(false);
const errorMsg = ref('');

// Check that the password and confirm password fields match and are not empty before allowing form submission
const isResetDisabled = computed(() => {
    if (!password.value || !confirmPassword.value) return true;
    return password.value !== confirmPassword.value || isLoading.value;
});

// Navigation Handlers for each step of the password reset process
// 1. Request OTP using email address
const handleEmailSubmit = async () => {
    if (!email.value.trim() || isLoading.value) return;

    isLoading.value = true;
    errorMsg.value = '';

    try {
        const response = await apiRequest.post('/auth/forgot-password', {
            email: email.value.trim()
        });

        toast.add({
            severity: 'success',
            summary: 'OTP Sent',
            detail: response.message,
            life: 5000
        });

        currentStep.value = 2;
    } catch (err) {
        errorMsg.value = err.message || 'Failed to request OTP.';
    } finally {
        isLoading.value = false;
    }
};

// 2. Validate OTP
const handleOtpSubmit = async () => {
    if (otp.value.length !== 6 || isLoading.value) return;

    isLoading.value = true;
    errorMsg.value = '';

    try {
        await apiRequest.post('/auth/verify-otp', {
            email: email.value.trim(),
            otp: otp.value
        });

        toast.add({
            severity: 'success',
            summary: 'OTP Verified',
            detail: 'Proceed to create new password.',
            life: 5000
        });

        currentStep.value = 3;
    } catch (err) {
        errorMsg.value = err.message || 'Invalid or expired OTP.';
    } finally {
        isLoading.value = false;
    }
};

// 3. Submit new password
const handlePasswordReset = async () => {
    if (isResetDisabled.value) return;

    isLoading.value = true;
    errorMsg.value = '';

    try {
        const response = await apiRequest.post('/auth/reset-password', {
            email: email.value.trim(),
            otp: otp.value,
            newPassword: password.value
        });

        toast.add({
            severity: 'success',
            summary: 'Password Updated',
            detail: response.message || 'Password has been reset successfully. Please proceed to login.',
            life: 5000
        });

        router.push('/login');
    } catch (err) {
        errorMsg.value = err.message || 'Failed to update password.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
/* UI Elements */
.forgot-password-screen {
    height: 100dvh;
    background-image: linear-gradient(rgba(250, 250, 250, 0.8), rgba(250, 250, 250, 0.8)), url('../assets/map-bg.png');
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    /* Prevent waves from causing scrollbars */
    position: relative;
    overflow: hidden;
}

.content-wrapper {
    width: 100%;
    max-width: 450px;
    display: flex;
    flex-direction: column;
}

.logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
}

.cd-logo {
    width: 100%;
    align-self: center;
}

/* .step-container {
    width: 100%;
} */

.instruction-container {
    text-align: center;
    margin-bottom: 1.5rem;
}

.instruction-container h2 {
    color: #003D7C;
    font-size: 1.5rem;
    margin-top: 0;
    margin-bottom: 0.5rem;
}

.instruction-container p {
    color: #4d4d4d;
    font-size: 0.9rem;
    line-height: 1.4;
}

.top-waves {
    position: absolute;
    top: 0;
    width: 100%;
    min-width: 600px;
    height: 15vh;
    object-fit: fill;
    pointer-events: none;
}

.bottom-waves {
    position: absolute;
    bottom: 0;
    width: 100%;
    min-width: 600px;
    height: 15vh;
    object-fit: fill;
    pointer-events: none;
}

/* 
  Transition from LoginView to ForgotPasswordView
  Waves slide out away from center
*/
@media (max-height: 750px) {
    .top-waves {
        animation: slideTopOut 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }

    .bottom-waves {
        animation: slideBottomOut 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
    }
}

@keyframes slideTopOut {
    from {
        transform: translateY(0);
    }

    to {
        transform: translateY(-10vh);
    }
}

@keyframes slideBottomOut {
    from {
        transform: translateY(0);
    }

    to {
        transform: translateY(10vh);
    }
}

/* Error Message Styling */
.error-msg {
    font-weight: bold;
    font-size: 0.9rem;
    color: red;
    margin-top: 0;
}

/* Form Styling */
.input-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    /* PrimeVue Theming Overrides */
    --p-iconfield-icon-color: #4d4d4d;
    --p-inputtext-background: #E5E7EB;
    --p-inputtext-color: #4d4d4d;
    --p-inputtext-placeholder-color: #4d4d4d;
    --p-inputtext-border-color: transparent;
    --p-inputtext-focus-border-color: #EF7C00;
}

.otp-wrapper {
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
}

.input-field {
    height: 3rem;
    width: 100%;
}

.btn-container {
    margin: 1.5rem 0;
}

.submit-btn,
.back-btn {
    display: block;
    text-align: center;
    text-decoration: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    border: none;
    font-size: 1rem;
    width: 100%;
    padding: 0.8rem 2.5rem;
}

.submit-btn {
    background-color: #003D7C;
    color: white;
    margin-bottom: 1rem;
}

.submit-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

.back-btn {
    background-color: #EF7C00;
    color: white;
    border: 1px solid #EF7C00;
}
</style>