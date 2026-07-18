<template>
  <div class="login-screen">
    <img src="../assets/top-waves-1.svg" alt="" class="top-waves" />
    <img src="../assets/bottom-waves-1.svg" alt="" class="bottom-waves" />

    <div class="content-wrapper">
      <div class="logo-container">
        <img src="../assets/logos/logo-full.svg" alt="CampusDash Logo" class="cd-logo" />
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <div class="input-container">
          <!-- IconField PrimeVue Component for placing icons inside input fields -->
          <IconField>
            <InputIcon class="pi pi-user" />
            <InputText v-model="username" placeholder="Username or Email" class="input-field" autocomplete="username" />
          </IconField>

          <IconField>
            <InputIcon class="pi pi-lock" />
            <Password v-model="password" placeholder="Password" class="input-field" :feedback="false" fluid toggleMask
              :inputProps="{ autocomplete: 'current-password' }" />
          </IconField>
        </div>

        <div class="form-actions">
          <RouterLink to="/forgot-password" class="forgot-link">Forgot Password?</RouterLink>
          <button type="submit" class="login-btn" :disabled="isSubmitDisabled">
            {{ isLoading ? 'Logging in...' : 'Login' }}
          </button>
        </div>

        <RouterLink to="/register" class="register-btn">New User</RouterLink>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../utils/api';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// Import PrimeVue components
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// Form fields
const username = ref('');
const password = ref('');

// UI State
const isLoading = ref(false);
const errorMsg = ref('');

const isSubmitDisabled = computed(() => {
  return !username.value || !password.value || isLoading.value;
});

// Function to submit login form data to the backend API
const handleLogin = async () => {
  if (isSubmitDisabled.value) return;

  isLoading.value = true;
  errorMsg.value = '';

  try {
    const response = await apiRequest.post('/auth/login', {
      username: username.value.trim(),
      password: password.value
    });
    authStore.setLoggedIn(response.user);

    toast.add({
      severity: 'success',
      summary: 'Login Successful!',
      detail: `Welcome back, ${response.user.username}!`,
      life: 5000
    });

    // Redirect to dashboard after successful login
    router.push('/');
  } catch (err) {
    errorMsg.value = err.message || 'An error has occurred.';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* UI Elements */
.login-screen {
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
  animation: introRise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.login-form {
  animation: introRise 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
}

.cd-logo {
  width: 100%;
  align-self: center;
}

@keyframes introRise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.top-waves {
  position: absolute;
  top: 0;
  width: 100%;
  min-width: 600px;
  height: 15vh;
  object-fit: fill;
  pointer-events: none;
  animation: waveRevealTop 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, waveDriftTop 8s ease-in-out 0.6s infinite;
}

.bottom-waves {
  position: absolute;
  bottom: 0;
  width: 100%;
  min-width: 600px;
  height: 15vh;
  object-fit: fill;
  pointer-events: none;
  animation: waveRevealBottom 0.6s cubic-bezier(0.16, 1, 0.3, 1) both, waveDriftBottom 8s ease-in-out 0.6s infinite;
}

@keyframes waveRevealTop {
  from {
    transform: translateY(-100%);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes waveRevealBottom {
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes waveDriftTop {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-4px);
  }
}

@keyframes waveDriftBottom {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(4px);
  }
}

/* 
  Transition from RegisterView to LoginView
  Waves slide in towards center
*/
@media (max-height: 750px) {
  .top-waves {
    animation: slideTopIn 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }

  .bottom-waves {
    animation: slideBottomIn 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  }
}

@keyframes slideTopIn {
  from {
    transform: translateY(-10vh);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes slideBottomIn {
  from {
    transform: translateY(10vh);
  }

  to {
    transform: translateY(0);
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

.form-actions {
  display: flex;
  justify-content: space-between;
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
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.login-btn:not(:disabled):hover,
.register-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.login-btn:not(:disabled):active,
.register-btn:not(:disabled):active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.login-btn {
  background-color: var(--color-primary);
  color: white;
  padding: 0.8rem 2.5rem;
}

.login-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.register-btn {
  background-color: #ffffff;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  width: 100%;
  padding: 1rem;
}

@media (prefers-reduced-motion: reduce) {

  .logo-container,
  .login-form,
  .top-waves,
  .bottom-waves {
    animation: none;
  }

  .login-btn,
  .register-btn {
    transition: none;
  }
}
</style>