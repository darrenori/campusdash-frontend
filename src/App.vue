<template>
  <div class="min-h-screen bg-gray-50 font-sans text-gray-900">

    <router-view />

  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useThemeStore } from './stores/theme';

const themeStore = useThemeStore();

onMounted(() => {
  themeStore.initTheme();
});
</script>

<style>
:root {
  /* DARK MODE (Default) */
  --bg-main: linear-gradient(135deg, rgba(5, 5, 5, 1) 0%, rgba(45, 45, 45, 1) 100%);
  --bg-surface: rgba(30, 30, 30, 0.8);
  --text-main: rgba(249, 250, 251, 1);
  --text-muted: rgba(156, 163, 175, 1);
  --border-color: rgba(55, 65, 81, 1);
}

/* LIGHT MODE */
[data-theme="light"] {
  --bg-main: rgba(243, 244, 246, 1);
  --bg-surface: rgba(255, 255, 255, 1);
  --text-main: rgba(17, 24, 39, 1);
  --text-muted: rgba(107, 114, 128, 1);
  --border-color: rgba(229, 231, 235, 1);
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
  background: var(--bg-main);
  color: var(--text-main);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}
</style>