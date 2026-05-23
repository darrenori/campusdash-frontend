<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-900">
    <Toast position="top-right" />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useThemeStore } from './stores/theme';

import Toast from 'primevue/toast';

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initTheme();
});
</script>

<style>
:root {
  /* Brand colors — same in all themes */
  --color-primary: #003D7C;
  --color-accent: #EF7C00;
  --color-success: #0e9f6e;
  --color-error: #ff3b30;
  --color-danger: #d33a2c;
  --color-info: #244783;

  /* DARK MODE (Default) */
  --bg-main: linear-gradient(135deg, rgba(5, 5, 5, 1) 0%, rgba(45, 45, 45, 1) 100%);
  --bg-surface: rgba(30, 30, 30, 0.8);
  --bg-card: #1c1c1e;
  --bg-input: rgba(44, 44, 46, 1);
  --text-main: rgba(249, 250, 251, 1);
  --text-muted: rgba(156, 163, 175, 1);
  --text-subtle: rgba(120, 120, 130, 1);
  --border-color: rgba(55, 65, 81, 1);
  --divider-color: rgba(55, 65, 81, 0.5);
}

/* LIGHT MODE */
[data-theme="light"] {
  --bg-main: rgba(243, 244, 246, 1);
  --bg-surface: rgba(255, 255, 255, 1);
  --bg-card: #ffffff;
  --bg-input: #f2f2f7;
  --text-main: rgba(17, 24, 39, 1);
  --text-muted: rgba(107, 114, 128, 1);
  --text-subtle: rgba(154, 154, 160, 1);
  --border-color: rgba(229, 231, 235, 1);
  --divider-color: #f1f1f4;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
  background: var(--bg-main);
  color: var(--text-main);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

/* PrimeVue Overrides */
.p-toast .p-toast-message {
  background: var(--bg-card);
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
}

.p-toast .p-toast-detail {
  color: var(--color-primary) !important;
}

@media screen and (max-width: 480px) {
  div.p-toast {
    width: 100% !important;
    left: 0 !important;
    right: 0 !important;
    padding: 0 16px !important;
  }
}
</style>