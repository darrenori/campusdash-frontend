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
            <InputText placeholder="Username" class="input-field" />
          </IconField>

          <IconField>
            <InputIcon class="pi pi-lock" />
            <InputText placeholder="Password" class="input-field" type="password" />
          </IconField>
        </div>

        <div class="form-actions">
          <a href="#" class="forgot-link">Forgot Password?</a>
          <button type="submit" class="login-btn">Login</button>
        </div>

        <button type="button" class="register-btn">New User</button>
      </form>
    </div>
  </div>
</template>

<script setup>
// Import PrimeVue components
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import InputText from 'primevue/inputtext';
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

.bottom-waves {
  position: absolute;
  bottom: 0;
  width: 100%;
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

/* Form Styling */
.input-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  /* PrimeVue Theming Overrides */
  --p-iconfield-icon-color: #4d4d4d;
  --p-inputtext-background: #E5E7EB;
  --p-inputtext-color: #003D7C;
  --p-inputtext-placeholder-color: #003D7C;
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