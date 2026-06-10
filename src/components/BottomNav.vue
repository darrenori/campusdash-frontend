<template>
  <nav class="bottom-nav">
    <button class="nav-item" :class="{ 'router-link-active': isDiscoverActive }" @click="goDiscover">
      <span class="icon"><i class="pi pi-compass"></i></span>
      <span class="label">Discover</span>
    </button>

    <router-link to="/history" class="nav-item">
      <span class="icon"><i class="pi pi-history"></i></span>
      <span class="label">History</span>
    </router-link>

    <div class="nav-item">
      <div class="points-badge">
        <span class="star"><i class="pi pi-star-fill"></i></span>
        <span class="amount">{{ authStore.user?.points ?? 0 }} PTS</span>
      </div>
    </div>

    <router-link to="/messages" class="nav-item">
      <span class="icon">
        <i class="pi pi-comments"></i>
        <span
          v-if="messagesStore.totalUnread > 0"
          class="nav-badge"
          :aria-label="`${messagesStore.totalUnread} unread messages`"
        >{{ messagesStore.totalUnread > 99 ? '99+' : messagesStore.totalUnread }}</span>
      </span>
      <span class="label">Messages</span>
    </router-link>

    <router-link to="/profile" class="nav-item">
      <span class="icon"><i class="pi pi-user"></i></span>
      <span class="label">Profile</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useRequestStore } from '../stores/requests';
import { useMessagesStore } from '../stores/messages';

const authStore = useAuthStore();
const requestStore = useRequestStore();
const messagesStore = useMessagesStore();
const router = useRouter();
const route = useRoute();

const isDiscoverActive = computed(() =>
    route.path === '/' || (requestStore.activeRequest && route.path === '/request')
);

function goDiscover() {
    // if (requestStore.activeRequest) {
    //     router.push('/request');
    // } else {
    //     router.push('/');
    // }

    router.push('/');
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background: var(--color-primary);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  text-decoration: none;
  background: transparent;
  border: none;
  cursor: pointer;
  flex: 1;
  height: 100%;
  transition: color 0.2s ease;
}

/* Currently selected tab */
.router-link-active,
.nav-item.router-link-active {
  color: var(--color-accent);
}

.icon {
  font-size: 1.4rem;
  margin-bottom: 2px;
  position: relative;
}

.nav-badge {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(40%);
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--color-accent);
  color: #fff;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 17px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--color-primary);
}

.label {
  font-size: 0.7rem;
  font-weight: 500;
}

/* Current points */
.points-badge {
  background-color: #ffffff;
  color: var(--color-accent);
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.star {
  font-size: 1.1rem;
}
</style>
