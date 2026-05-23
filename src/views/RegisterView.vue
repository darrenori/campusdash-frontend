<template>
    <div class="register-screen">
        <img src="../assets/top-waves-1.svg" alt="" class="top-waves" />
        <img src="../assets/bottom-waves-1.svg" alt="" class="bottom-waves" />

        <div class="content-wrapper">
            <div class="logo-container">
                <img src="../assets/logos/logo-full.svg" alt="CampusDash Logo" class="cd-logo" />
            </div>

            <form class="register-form" @submit.prevent="handleRegister">
                <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

                <div class="input-container">
                    <!-- IconField PrimeVue Component for placing icons inside input fields -->
                    <IconField>
                        <InputIcon class="pi pi-user" />
                        <InputText v-model="username" placeholder="Username" class="input-field"
                            autocomplete="username" />
                    </IconField>

                    <IconField>
                        <InputIcon class="pi pi-envelope" />
                        <InputText v-model="email" placeholder="Email" class="input-field" autocomplete="email" />
                    </IconField>

                    <IconField>
                        <InputIcon class="pi pi-lock" />
                        <Password v-model="password" placeholder="Password" class="input-field" :feedback="false" fluid
                            toggleMask :inputProps="{ autocomplete: 'new-password' }" />
                    </IconField>

                    <IconField>
                        <InputIcon class="pi pi-key" />
                        <Password v-model="confirmPassword" placeholder="Confirm Password" class="input-field"
                            :feedback="false" fluid toggleMask :inputProps="{ autocomplete: 'new-password' }" />
                    </IconField>
                </div>

                <div class="btn-container">
                    <button type="submit" class="register-btn" :disabled="isSubmitDisabled">
                        {{ isLoading ? 'Registering...' : 'Register' }}
                    </button>
                    <RouterLink to="/login" class="login-btn">Existing User</RouterLink>
                </div>

            </form>
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
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Form fields
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

// UI State
const isLoading = ref(false);
const errorMsg = ref('');

const isSubmitDisabled = computed(() => {
    // Check that the fields are not empty before allowing form submission
    if (!username.value.trim() || !email.value.trim() || !password.value || !confirmPassword.value || isLoading.value) return true;

    // Check that the password and confirm password fields match before allowing form submission
    return password.value !== confirmPassword.value;
});

// Function to submit registration form data to the backend API
const handleRegister = async () => {
    if (isSubmitDisabled.value) return;

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
            summary: 'Account Registered!',
            detail: response.message || 'Redirecting to login...',
            life: 5000
        });

        // Redirect to login page when successfully registered
        router.push('/login');
    } catch (err) {
        errorMsg.value = err.message || 'An error has occurred.';
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