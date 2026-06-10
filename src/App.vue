<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-900">
    <Toast position="top-right" />
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import { useThemeStore } from './stores/theme';
import { useAuthStore } from './stores/auth';
import { useMessagesStore } from './stores/messages';

import Toast from 'primevue/toast';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const messagesStore = useMessagesStore();

// Keep the realtime messages store bound while authenticated so the unread
// badge stays live everywhere; reset it on logout.
watch(
  () => authStore.isAuthenticated,
  (authed) => {
    if (authed) messagesStore.init();
    else messagesStore.reset();
  },
  { immediate: true }
);

onMounted(() => {
  themeStore.initTheme();
});
</script>

<style>
:root {
  /* Universal colors (fixed) */
  --color-primary: #003D7C;
  --color-accent: #EF7C00;
  --color-success: #0e9f6e;
  --color-error: #ff3b30;
  --color-danger: #d33a2c;
  --color-info: #244783;

  /* DARK MODE */
  --bg-main: linear-gradient(135deg, rgba(5, 5, 5, 1) 0%, rgba(45, 45, 45, 1) 100%);
  --bg-surface: rgba(30, 30, 30, 0.95);
  --bg-card: #1c1c1e;
  --bg-input: rgba(44, 44, 46, 1);
  --text-main: rgba(249, 250, 251, 1);
  --text-muted: rgba(156, 163, 175, 1);
  --text-subtle: rgba(120, 120, 130, 1);
  --border-color: rgba(55, 65, 81, 1);
  --theme-blue: #0065C9;
  --divider-color: rgba(69, 69, 69, 0.5);

  /* DRAWER DARK */
  --drawer-bg: rgb(45, 45, 45);
  --info-card: rgb(39, 39, 39);
  --info-border: rgb(55, 55, 55);
  --chat-button: rgb(45, 45, 45);
  --bubble-bg: rgb(56, 56, 56);
  --drawer-text: #c4c4c4;
}

/* LIGHT MODE (Default) */
[data-theme="light"] {
  --bg-main: rgba(243, 244, 246, 0.95);
  --bg-surface: rgba(255, 255, 255, 1);
  --bg-card: #ffffff;
  --bg-input: #f2f2f7;
  --text-main: rgba(17, 24, 39, 1);
  --text-muted: rgba(107, 114, 128, 1);
  --text-subtle: rgba(154, 154, 160, 1);
  --border-color: rgba(229, 231, 235, 1);
  --theme-blue: #003D7C;
  --divider-color: #f1f1f4;

  /* DRAWER LIGHT */
  --drawer-bg: rgb(255, 255, 255);
  --info-card: rgb(243, 243, 243);
  --info-border: lightgray;
  --chat-button: white;
  --bubble-bg: white;
  --drawer-text: #003D7C;
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
  background: #ffffff;
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

.p-dialog {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border-color) !important;
  color: var(--text-main) !important;
}

.p-dialog-title,
.p-dialog-header-close-icon {
  color: var(--text-main) !important;
}

.p-dialog-header,
.p-dialog-content {
  background: transparent !important;
}
</style>