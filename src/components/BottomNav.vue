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

    <div class="nav-item points-nav-item" data-tour="nav-points">
      <div class="points-badge">
        <span class="star"><i class="pi pi-star-fill"></i></span>
        <span class="points-text">
          <span class="points-value">{{ authStore.user?.points ?? 0 }}</span>
          <span class="points-unit">PTS</span>
        </span>
      </div>
    </div>

    <router-link to="/messages" class="nav-item" data-tour="nav-messages">
      <span class="icon">
        <i class="pi pi-comments"></i>
        <span v-if="messagesStore.totalUnread > 0" class="nav-badge"
          :aria-label="`${messagesStore.totalUnread} unread messages`">{{ messagesStore.totalUnread > 99 ? '99+' :
            messagesStore.totalUnread }}</span>
      </span>
      <span class="label">Messages</span>
    </router-link>

    <router-link to="/profile" class="nav-item" data-tour="nav-profile">
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
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)) auto repeat(2, minmax(0, 1fr));
  column-gap: 2px;
  align-items: center;
  z-index: 1000;
  padding: 0 8px;
  box-sizing: border-box;
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
  min-width: 0;
  height: 100%;
  transition: color 0.2s ease;
}

.points-nav-item {
  cursor: default;
  padding: 0 2px;
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
  white-space: nowrap;
}

/* Current points */
.points-badge {
  background-color: #ffffff;
  color: var(--color-accent);
  padding: 9px 14px;
  border-radius: 999px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  max-width: 100%;
  box-sizing: border-box;
}

.star {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.points-text {
  display: flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
  white-space: nowrap;
  font-size: 1.08rem;
}

.points-value {
  font-weight: 600;
}

.points-unit {
  font-weight: 600;
}

/* Small screens */
@media (max-width: 420px) {
  .bottom-nav {
    padding: 0 6px;
    column-gap: 1px;
  }

  .label {
    font-size: 0.64rem;
  }

  .icon {
    font-size: 1.32rem;
  }

  .points-badge {
    padding: 7px 12px;
    gap: 6px;
    border-radius: 22px;
  }

  .points-text {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
    font-size: 1rem;
  }

  .points-value {
    font-size: 1rem;
  }

  .points-unit {
    font-size: 0.62rem;
  }

  .star {
    font-size: 0.95rem;
  }
}

@media (max-width: 340px) {
  .bottom-nav {
    padding: 0 4px;
  }

  .label {
    font-size: 0.61rem;
  }

  .icon {
    font-size: 1.24rem;
  }

  .points-badge {
    padding: 6px 8px;
    gap: 5px;
  }

  .points-text {
    font-size: 0.92rem;
  }

  .points-value {
    font-size: 0.92rem;
  }

  .points-unit {
    font-size: 0.54rem;
  }

  .star {
    font-size: 0.84rem;
  }
}
</style>
