<template>
  <div class="login-screen">
    <img src="../assets/top-waves-1.svg" alt="" class="top-waves" />
    <img src="../assets/bottom-waves-1.svg" alt="" class="bottom-waves" />

    <div class="content-wrapper">
      <div class="logo-container">
        <img src="../assets/logos/logo-full.svg" alt="CampusDash Logo" class="cd-logo" />
      </div>

      <form class="login-form" @submit.prevent>
        <div class="input-container">
          <!-- IconField PrimeVue Component for placing icons inside input fields -->
          <IconField>
            <InputIcon class="pi pi-user" />
            <InputText v-model="username" placeholder="Username" class="input-field" autocomplete="username" />
          </IconField>

          <IconField>
            <InputIcon class="pi pi-lock" />
            <Password v-model="password" placeholder="Password" class="input-field" :feedback="false" fluid toggleMask
              :inputProps="{ autocomplete: 'current-password' }" />
          </IconField>
        </div>

        <div class="form-actions">
          <RouterLink to="/forgot-password" class="forgot-link">Forgot Password?</RouterLink>
          <button type="submit" class="login-btn">Login</button>
        </div>

        <RouterLink to="/register" class="register-btn">New User</RouterLink>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// Import PrimeVue components
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';

// Form fields
const username = ref('');
const password = ref('');

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
  color: #003D7C;
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
}

.login-btn {
  background-color: #003D7C;
  color: white;
  padding: 0.8rem 2.5rem;
}

.register-btn {
  background-color: white;
  color: #003D7C;
  border: 1px solid #003D7C;
  width: 100%;
  padding: 1rem;
}
</style>