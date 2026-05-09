<template>
  <nav class="bottom-nav">
    <router-link to="/" class="nav-item">
      <span class="icon">🧭</span>
      <span class="label">Discover</span>
    </router-link>

    <router-link to="/history" class="nav-item">
      <span class="icon">🕒</span>
      <span class="label">History</span>
    </router-link>

    <div class="nav-item token-center">
      <div class="token-badge">
        <span class="star">★</span>
        <span class="amount">XXX</span>
      </div>
    </div>

    <router-link to="/messages" class="nav-item">
      <span class="icon">💬</span>
      <span class="label">Messages</span>
    </router-link>

    <router-link to="/profile" class="nav-item">
      <span class="icon">👤</span>
      <span class="label">Profile</span>
    </router-link>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background: var(--bg-surface);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--border-color);
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
  color: var(--text-muted);
  text-decoration: none;
  cursor: pointer;
  flex: 1;
  transition: color 0.2s ease;
}

.router-link-active {
  color: #10b981;
}

.icon {
  font-size: 1.25rem;
  margin-bottom: 2px;
}

.label {
  font-size: 0.7rem;
  font-weight: 500;
}

.token-center {
  flex: 1.5;
  cursor: default;
}

.token-badge {
  background-color: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.star {
  font-size: 1.1rem;
}
</style>