<template>
    <div class="register-screen">
        <img src="../assets/top-waves-1.svg" alt="" class="top-waves" />
        <img src="../assets/bottom-waves-1.svg" alt="" class="bottom-waves" />

        <div class="content-wrapper">
            <div class="logo-container">
                <img src="../assets/logos/logo-full.svg" alt="CampusDash Logo" class="cd-logo" />
            </div>

            <form v-if="currentStep === 1" class="register-form" @submit.prevent="handleRegister">
                <p v-if="displayErrorMsg" class="error-msg">{{ displayErrorMsg }}</p>

                <div class="input-container">
                    <!-- IconField PrimeVue Component for placing icons inside input fields -->
                    <IconField>
                        <InputIcon class="pi pi-user" />
                        <InputText v-model="username" placeholder="Username" class="input-field" autocomplete="username"
                            maxlength="20" />
                    </IconField>

                    <IconField>
                        <InputIcon class="pi pi-envelope" />
                        <InputText v-model="email" placeholder="NUS Email" class="input-field" type="email"
                            autocomplete="email" />
                    </IconField>

                    <div class="password-field-wrap">
                        <IconField>
                            <InputIcon class="pi pi-lock" />
                            <Password v-model="password" placeholder="Password" class="input-field" :feedback="false"
                                fluid toggleMask :inputProps="{ autocomplete: 'new-password' }" />
                        </IconField>
                        <PasswordRequirementsHint :value="password" />
                    </div>

                    <IconField>
                        <InputIcon class="pi pi-key" />
                        <Password v-model="confirmPassword" placeholder="Confirm Password" class="input-field"
                            :feedback="false" fluid toggleMask :inputProps="{ autocomplete: 'new-password' }" />
                    </IconField>
                </div>

                <div class="btn-container">
                    <button type="submit" class="register-btn" :disabled="isSubmitDisabled">
                        {{ isLoading ? 'Sending...' : 'Send Verification Code' }}
                    </button>
                    <RouterLink to="/login" class="login-btn">Existing User</RouterLink>
                </div>

            </form>

            <div v-else class="step-container">
                <div class="instruction-container">
                    <h2>Verify Your Email</h2>
                    <p>We sent a 6-digit code to <strong>{{ email }}</strong>. Enter it below to finish registration.</p>
                </div>

                <form class="register-form" @submit.prevent="handleOtpSubmit">
                    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

                    <div class="input-container otp-wrapper">
                        <InputOtp v-model="otp" :length="6" integerOnly class="otp-input" :disabled="isLoading" />
                    </div>

                    <div class="btn-container">
                        <button type="submit" class="register-btn" :disabled="otp.length !== 6 || isLoading">
                            {{ isLoading ? 'Verifying...' : 'Verify Code' }}
                        </button>
                        <button type="button" class="login-btn" @click="currentStep = 1" :disabled="isLoading">
                            Back
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
import PasswordRequirementsHint from '../components/PasswordRequirementsHint.vue';
import { PASSWORD_POLICY_ERROR, isStrongPassword } from '../utils/passwordPolicy';

const toast = useToast();

// Form fields
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const otp = ref('');

// UI State
const currentStep = ref(1);
const isLoading = ref(false);
const errorMsg = ref('');

const isNusEmail = computed(() => email.value.trim().toLowerCase().endsWith('@u.nus.edu'));
const isUsernameValid = computed(() => !username.value.trim().includes('@'));
const hasStartedRegisterForm = computed(() => Boolean(
    username.value.trim() ||
    email.value.trim() ||
    password.value ||
    confirmPassword.value
));

const registerValidationMessage = computed(() => {
    if (!username.value.trim() || !email.value.trim() || !password.value || !confirmPassword.value) return 'Fill in all fields to continue.';

    if (!isUsernameValid.value) return 'Username cannot contain @.';

    if (!isNusEmail.value) return 'Registration requires a @u.nus.edu email address.';

    if (!isStrongPassword(password.value)) return PASSWORD_POLICY_ERROR;

    if (password.value !== confirmPassword.value) return 'Passwords do not match.';

    return '';
});

const isSubmitDisabled = computed(() => isLoading.value || Boolean(registerValidationMessage.value));
const displayErrorMsg = computed(() => {
    if (hasStartedRegisterForm.value && registerValidationMessage.value) return registerValidationMessage.value;
    return errorMsg.value;
});

// Function to submit registration form data to the backend API
const handleRegister = async () => {
    if (isSubmitDisabled.value) return;

    if (username.value.length > 20) {
        errorMsg.value = 'Username cannot exceed 20 characters.';
        return;
    }

    isLoading.value = true;
    errorMsg.value = '';

    try {
        const response = await apiRequest.post('/auth/register', {
            username: username.value.trim(),
            email: email.value.trim(),
            password: password.value
        });

        toast.add({
            severity: 'success',
            summary: 'OTP Sent',
            detail: response.message,
            life: 5000
        });

        currentStep.value = 2;
    } catch (err) {
        errorMsg.value = err.message || 'An error has occurred.';
    } finally {
        isLoading.value = false;
    }
};

const handleOtpSubmit = async () => {
    if (otp.value.length !== 6 || isLoading.value) return;

    isLoading.value = true;
    errorMsg.value = '';

    try {
        const response = await apiRequest.post('/auth/register/verify-otp', {
            email: email.value.trim(),
            otp: otp.value
        });

        toast.add({
            severity: 'success',
            summary: 'Account Registered!',
            detail: response.message || 'User registered successfully. Please proceed to login.',
            life: 5000
        });

        router.push('/login');
    } catch (err) {
        errorMsg.value = err.message || 'Invalid or expired OTP.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
/* UI Elements */
.register-screen {
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

.instruction-container {
    text-align: center;
    margin-bottom: 1.5rem;
}

.instruction-container h2 {
    color: var(--color-primary);
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
  Transition from LoginView to RegisterView
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

.input-field {
    height: 3rem;
    width: 100%;
}

.password-field-wrap {
    position: relative;
}

.otp-wrapper {
    align-items: center;
    justify-content: center;
    margin: 1rem 0;
}

.btn-container {
    margin: 1.5rem 0;
}

.forgot-link {
    color: var(--color-primary);
    text-decoration: none;
}

.login-btn,
.register-btn {
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

.register-btn {
    background-color: var(--color-primary);
    color: white;
    margin-bottom: 1rem;
}

.register-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
}

.login-btn {
    background-color: var(--color-accent);
    color: white;
    border: 1px solid var(--color-accent);
}
</style>
