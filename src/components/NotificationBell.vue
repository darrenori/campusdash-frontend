<template>
  <button
    class="notif-bell"
    :class="{ active: open }"
    :aria-label="store.unreadCount > 0 ? `${store.unreadCount} unread notifications` : 'Notifications'"
    @click="open = true"
  >
    <i class="pi pi-bell"></i>
    <span v-if="store.unreadCount > 0" class="notif-badge">
      {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
    </span>
  </button>

  <NotificationCenter v-model:visible="open" />
</template>

<script setup>
import { ref } from 'vue';
import { useNotificationsStore } from '../stores/notifications';
import NotificationCenter from './NotificationCenter.vue';

const store = useNotificationsStore();
const open = ref(false);
</script>

<style scoped>
/*dark is the default theme, so the base rule is the dark glass look; light mode
overrides it below*/
.notif-bell {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(40, 40, 42, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
  font-size: 1.15rem;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.14s ease, background 0.2s ease;
}

.notif-bell:active,
.notif-bell.active {
  transform: scale(0.92);
}

[data-theme='light'] .notif-bell {
  color: var(--color-primary);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.notif-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--color-error);
  color: #fff;
  font-family: 'Inter', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg-main);
}
</style>
