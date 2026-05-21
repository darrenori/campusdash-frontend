<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item">
      <span class="icon"><i class="pi pi-compass"></i></span>
      <span class="label">Discover</span>
    </router-link>

    <router-link to="/history" class="nav-item">
      <span class="icon"><i class="pi pi-history"></i></span>
      <span class="label">History</span>
    </router-link>

    <div class="nav-item">
      <div class="points-badge">
        <span class="star"><i class="pi pi-star-fill"></i></span>
        <span class="amount">{{ authStore.user?.points ?? '—' }} PTS</span>
      </div>
    </div>

    <div class="nav-item nav-disabled">
      <span class="icon"><i class="pi pi-comments"></i></span>
      <span class="label">Messages</span>
    </div>

    <router-link to="/profile" class="nav-item">
      <span class="icon"><i class="pi pi-user"></i></span>
      <span class="label">Profile</span>
    </router-link>
  </nav>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
const authStore = useAuthStore();
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background: #003D7C;
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
  color: #FFFFFF;
  text-decoration: none;
  cursor: pointer;
  flex: 1;
  transition: color 0.2s ease;
}

.nav-disabled {
  cursor: default;
  opacity: 0.9;
}

/* Currently selected tab */
.router-link-active {
  color: #EF7C00;
}

.icon {
  font-size: 1.4rem;
  margin-bottom: 2px;
}

.label {
  font-size: 0.7rem;
  font-weight: 500;
}

/* Current points */
.points-badge {
  background-color: #FFFFFF;
  color: #EF7C00;
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
