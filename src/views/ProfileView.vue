<template>
    <div class="app-screen">

        <div class="profile-header">
            <h1 class="page-title">Profile</h1>
        </div>

        <div class="settings-container">
            <div class="setting-card">
                <div class="setting-info">
                    <span class="icon">
                        <i :class="isDark ? 'pi pi-moon' : 'pi pi-sun'"></i>
                    </span> <span class="setting-label">Appearance</span>
                </div>

                <button @click="toggleTheme" class="toggle-btn" :class="{ 'is-active': isDark }">
                    <div class="toggle-knob"></div>
                </button>
            </div>
        </div>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BottomNav from '../components/BottomNav.vue'

const isDark = ref(true)

const toggleTheme = () => {
    isDark.value = !isDark.value

    if (!isDark.value) {
        document.documentElement.setAttribute('data-theme', 'light')
        localStorage.setItem('theme', 'light')
    } else {
        document.documentElement.removeAttribute('data-theme')
        localStorage.setItem('theme', 'dark')
    }
}

onMounted(() => {
    const savedTheme = localStorage.getItem('theme')

    if (savedTheme === 'light') {
        isDark.value = false
        document.documentElement.setAttribute('data-theme', 'light')
    } else {
        // Default to Dark Mode
        document.documentElement.removeAttribute('data-theme')
    }
})
</script>

<style scoped>
.app-screen {
    position: relative;
    height: 100vh;
    width: 100vw;
    overflow-y: auto;
    background-color: var(--bg-main);
    padding-bottom: 90px;
}

.profile-header {
    padding: 24px 20px 10px;
}

.page-title {
    margin: 0;
    font-size: 1.75rem;
    color: var(--text-main);
}

.settings-container {
    padding: 0 20px;
}

.setting-card {
    background-color: var(--bg-surface);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    transition: all 0.3s ease;
}

.setting-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.icon {
    font-size: 1.5rem;
}

.setting-label {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-main);
}

.toggle-btn {
    width: 50px;
    height: 30px;
    border-radius: 30px;
    background-color: #e5e7eb;
    border: none;
    cursor: pointer;
    position: relative;
    transition: background-color 0.3s ease;
}

.toggle-btn.is-active {
    background-color: #10b981;
}

.toggle-knob {
    width: 26px;
    height: 26px;
    background-color: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-btn.is-active .toggle-knob {
    transform: translateX(20px);
}
</style>