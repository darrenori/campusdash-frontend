<template>
    <div class="profile-screen">
        <div class="header-banner">
            <button class="logout-btn" @click="handleLogout">
                <i class="pi pi-sign-out"></i>
            </button>
        </div>

        <div class="main-content-wrapper">
            <div v-if="!showEditView">
                <!-- Profile picture, username, and metadata -->
                <div class="profile-card">
                    <div class="pfp-wrapper">
                        <img v-if="userProfile.pfpUrl" :src="userProfile.pfpUrl" class="pfp-img" />
                        <i v-else class="pi pi-user default-pfp"></i>
                    </div>

                    <h2 class="username-title">
                        {{ userProfile.username }}
                    </h2>
                    <div class="metadata-rows">
                        <p class="meta-item">Member since: {{ userProfile.memberSince }}</p>
                        <p class="meta-item">Deliveries Completed: {{ userProfile.deliveriesCount }}</p>
                    </div>

                    <div class="badges-indicator">
                        Badges: {{ userProfile.numBadges }}
                    </div>
                </div>

                <!-- Controls -->
                <div class="action-buttons-row">
                    <button @click="themeStore.toggleTheme()" class="action-btn">
                        <i :class="themeStore.isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
                        <span>{{ themeStore.isDark ? 'Light Mode' : 'Dark Mode' }}</span>
                    </button>

                    <button class="action-btn" @click="showEditView = true">
                        <i class="pi pi-user-edit"></i>
                        <span>Edit Info</span>
                    </button>

                    <button class="action-btn" @click="showQrModal = true">
                        <i class="pi pi-qrcode"></i>
                        <span>PayNow</span>
                    </button>
                </div>

                <!-- PayNow QR Code Preview -->
                <div class="qr-preview-section">
                    <div class="qr-container-box">
                        <div v-if="userProfile.qrCodeUrl" class="qr-graphic-frame">
                            <img :src="userProfile.qrCodeUrl" class="qr-img" />
                        </div>
                        <div v-else class="qr-fallback">
                            <i class="pi pi-images qr-fallback-icon"></i>
                            <p>No PayNow QR Uploaded</p>
                        </div>
                    </div>
                </div>

                <!-- Badges -->
                <div class="badges-container">
                    <h3 class="badges-title">BADGES</h3>
                    <div class="badges-grid-layout">
                        <div v-for="n in 4" :key="n" class="badge-slot">
                            <i class="pi pi-plus plus-icon"></i>
                        </div>
                    </div>
                </div>
            </div>

            <EditProfile v-else v-model:visible="showEditView" :userData="userProfile" />
            <EditPayNow v-model:visible="showQrModal" :currentQrUrl="userProfile.qrCodeUrl" />
        </div>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';

import EditProfile from '../components/EditProfile.vue';
import EditPayNow from '../components/EditPayNow.vue';
import BottomNav from '../components/BottomNav.vue';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const router = useRouter();

const showEditView = ref(false);
const showQrModal = ref(false);

const handleLogout = async () => {
    await authStore.logout();
};

const userProfile = computed(() => {
    const userData = authStore.user;
    let fileServerUrl = import.meta.env.VITE_FILE_SERVER_URL || '';
    if (fileServerUrl.endsWith('/')) {
        fileServerUrl = fileServerUrl.slice(0, -1);
    }
    const resolvePath = (url) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${fileServerUrl}${url}`;
    };
    const fullPfpPath = resolvePath(userData?.pfp_url);
    const fullQrPath = resolvePath(userData?.paynow_qr_url);

    return {
        username: userData?.username || 'Guest',
        email: userData?.email || '',
        memberSince: userData?.created_at
            ? new Date(userData.created_at).toLocaleDateString('en-GB')
            : '01-01-1970',
        deliveriesCount: 0,
        numBadges: 0,
        pfpUrl: fullPfpPath,
        qrCodeUrl: fullQrPath
    };
});
</script>

<style scoped>
.profile-screen {
    position: relative;
    height: 100dvh;
    overflow-y: auto;
    background: var(--bg-main);
    /* Make room for bottom nav */
    padding-bottom: 90px;
}

.header-banner {
    position: absolute;
    width: 100%;
    height: 180px;
    z-index: 1;
    background-image: url('../assets/top-waves-2.svg');
    background-size: 100% 100%;
}

.logout-btn {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 5;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
}

.logout-btn:active {
    transform: scale(0.9);
}

.logout-btn i {
    font-size: 1.4rem;
}

.main-content-wrapper {
    position: relative;
    z-index: 2;
    margin-top: 50px;
}

/* Profile and metadata */
.profile-card {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
}

.pfp-wrapper {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: #ffffff;
    border: 3px solid var(--theme-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    transition: border-color 0.3s ease;
}

.pfp-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.default-pfp {
    font-size: 2.5rem;
    color: var(--theme-blue);
}

.username-title {
    margin: 10px 0 10px 0;
    font-size: 1.5rem;
    font-weight: 700;
    transition: color 0.3s ease;
    color: var(--theme-blue);
}

.metadata-rows {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.meta-item {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
}

.badges-indicator {
    margin-top: 8px;
    background-color: #EF7C00;
    color: #ffffff;
    font-size: 0.75rem;
    padding: 5px 10px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
}

/* Controls Section */
.action-buttons-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 15px 20px;
    width: 100%;
}

.action-btn {
    flex: 1;
    max-width: 120px;
    background-color: #EF7C00;
    border: none;
    border-radius: 12px;
    padding: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: white;
    font-weight: bold;
    font-size: 0.8rem;
    cursor: pointer;
}

.action-btn:active {
    transform: scale(0.96);
    background-color: #de7300;
}

.action-btn i {
    font-size: 0.95rem;
}

/* PayNow QR Code Section */
.qr-preview-section {
    padding: 15px;
    display: flex;
    justify-content: center;
}

.qr-container-box {
    background-color: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 240px;
    aspect-ratio: 1;
}

.qr-graphic-frame {
    border: 3px solid #822a76;
    border-radius: 16px;
    padding: 8px;
    background: #ffffff;
}

.qr-img {
    display: block;
    object-fit: contain;
    max-height: 240px;
    max-width: 240px;
}

.qr-fallback {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 0.85rem;
    text-align: center;
}

.qr-fallback-icon {
    font-size: 2rem;
    opacity: 0.6;
}

/* Badges Section */
.badges-container {
    padding: 20px 24px;
    max-width: 500px;
    margin: 0 auto;
}

.badges-title {
    margin: 0 0 12px 0;
    font-weight: 700;
    color: #EF7C00;
    letter-spacing: 0.05em;
    text-align: center;
}

.badges-grid-layout {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    width: 100%;
}

.badge-slot {
    border: 2px dashed #EF7C00;
    color: #EF7C00;
    border-radius: 14px;
    aspect-ratio: 1;
    max-width: 100px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.plus-icon {
    font-size: 0.9rem;
}
</style>