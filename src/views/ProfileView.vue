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

                    <div class="stats-strip">
                        <div class="stat-cell">
                            <span class="stat-value">{{ userProfile.memberSince }}</span>
                            <span class="stat-label">Member Since</span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat-cell">
                            <span class="stat-value">{{ userProfile.deliveriesCount }}</span>
                            <span class="stat-label">Deliveries</span>
                        </div>
                    </div>

                    <div class="badges-indicator">
                        Badges: {{ unlockedAchievements.length }}
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

                <!-- Displayed Badges -->
                <div class="badges-container">
                    <h3 class="badges-title">BADGES</h3>

                    <div class="badges-grid-layout">
                        <button v-for="(badge, index) in displayedBadgeSlots"
                            :key="badge?.code || `empty-badge-${index}`" type="button" class="badge-slot"
                            :class="{ 'filled-badge-slot': badge }" @click="showBadgeDialog = true">
                            <template v-if="badge">
                                <img :src="getBadgeIcon(badge)" :alt="badge.name" class="badge-img" />
                            </template>

                            <i v-else class="pi pi-plus plus-icon"></i>
                        </button>
                    </div>
                </div>
            </div>

            <EditProfile v-else v-model:visible="showEditView" :userData="userProfile" />
            <EditPayNow v-model:visible="showQrModal" :currentQrUrl="userProfile.qrCodeUrl"
                @qr-updated="handleQrUpdated" />
        </div>

        <Dialog v-model:visible="showBadgeDialog" modal dismissableMask header="Select Badges"
            :style="{ width: '88vw', maxWidth: '390px' }" :draggable="false" class="badge-select-dialog">
            <div class="badge-dialog-content">
                <p v-if="achievementsError" class="badge-error">
                    {{ achievementsError }}
                </p>

                <p v-else-if="achievementsLoading" class="badge-helper-text">
                    Loading badges...
                </p>

                <template v-else>
                    <p class="badge-helper-text">
                        Select up to 4 badges to display.
                    </p>

                    <div class="badge-selection-grid">
                        <button v-for="badge in allAchievements" :key="badge.code" type="button" class="badge-choice"
                            :class="{
                                selected: isDisplayedBadge(badge),
                                locked: !badge.unlocked
                            }" :disabled="!badge.unlocked" @click="toggleDisplayedBadge(badge)">
                            <span v-if="isDisplayedBadge(badge)" class="selected-order">
                                {{ selectedBadgeOrder(badge) }}
                            </span>

                            <div class="badge-choice-name">
                                {{ badge.name }}
                            </div>

                            <div class="badge-choice-icon">
                                <img :src="getBadgeIcon(badge)" :alt="badge.name" class="badge-img" />

                                <div v-if="!badge.unlocked" class="locked-overlay">
                                    <span v-if="badge.goal > 1" class="locked-progress-overlay">
                                        {{ badge.progress }}/{{ badge.goal }}
                                    </span>
                                    <i v-else class="pi pi-lock"></i>
                                </div>
                            </div>

                            <div class="badge-choice-description">
                                {{ badge.description }}
                            </div>
                        </button>
                    </div>
                </template>
            </div>
        </Dialog>

        <BottomNav />
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';

import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { apiRequest } from '../utils/api';
import { resolveFileUrl } from '../utils/fileUrl';

import EditProfile from '../components/EditProfile.vue';
import EditPayNow from '../components/EditPayNow.vue';
import BottomNav from '../components/BottomNav.vue';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const toast = useToast();

const showEditView = ref(false);
const showQrModal = ref(false);
const showBadgeDialog = ref(false);

const allAchievements = ref([]);
const displayedBadgeCodes = ref([]);
const achievementsLoading = ref(false);
const achievementsError = ref('');

const badgeModules = import.meta.glob('../assets/badges/*.{png,jpg,jpeg,svg,webp}', {
    eager: true,
    import: 'default'
});

const badgeIconMap = Object.fromEntries(
    Object.entries(badgeModules).map(([path, src]) => {
        const filename = path.split('/').pop();
        const iconKey = filename.replace(/\.(png|jpe?g|svg|webp)$/i, '');

        return [iconKey, src];
    })
);

const DEFAULT_BADGE_ICON_KEY = 'default';

const handleLogout = async () => {
    await authStore.logout();
};

const userProfile = computed(() => {
    const userData = authStore.user;

    return {
        username: userData?.username || 'Guest',
        email: userData?.email || '',
        memberSince: userData?.created_at
            ? new Date(userData.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
            : 'Unknown',
        deliveriesCount: Number(userData?.deliveries_completed ?? 0),
        pfpUrl: resolveFileUrl(userData?.pfp_url),
        qrCodeUrl: resolveFileUrl(userData?.paynow_qr_url)
    };
});

const unlockedAchievements = computed(() =>
    allAchievements.value.filter((badge) => badge.unlocked)
);

const displayedBadges = computed(() => {
    const badgeByCode = new Map(allAchievements.value.map((badge) => [badge.code, badge]));

    return displayedBadgeCodes.value
        .map((code) => badgeByCode.get(code))
        .filter((badge) => badge?.unlocked)
        .slice(0, 4);
});

const displayedBadgeSlots = computed(() =>
    Array.from({ length: 4 }, (_, index) => displayedBadges.value[index] || null)
);

const normalizeAchievement = (achievement) => ({
    ...achievement,
    iconKey: achievement.iconKey ?? achievement.icon_key,
    sortOrder: achievement.sortOrder ?? achievement.sort_order,
    unlockedAt: achievement.unlockedAt ?? achievement.unlocked_at,
    progress: Number(achievement.progress ?? 0),
    goal: Number(achievement.goal ?? 1),
    unlocked: Boolean(achievement.unlocked)
});

const normalizeAchievements = (achievements = []) => {
    if (!Array.isArray(achievements)) return [];

    const seen = new Set();

    return achievements
        .map(normalizeAchievement)
        .filter((achievement) => {
            if (!achievement.code || seen.has(achievement.code)) return false;
            seen.add(achievement.code);
            return true;
        });
};

const getBadgeIcon = (badge) => {
    return badgeIconMap[badge?.iconKey] || badgeIconMap[DEFAULT_BADGE_ICON_KEY];
};

const loadAchievements = async () => {
    if (!authStore.user) {
        allAchievements.value = [];
        displayedBadgeCodes.value = [];
        return;
    }

    achievementsLoading.value = true;
    achievementsError.value = '';

    try {
        const response = await apiRequest.get('/achievements/me');

        allAchievements.value = normalizeAchievements(response.achievements);
        displayedBadgeCodes.value = (response.displayedAchievements || [])
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((badge) => badge.code);
    } catch (err) {
        achievementsError.value = err.response?.data?.error || err.message || 'Failed to load badges.';
    } finally {
        achievementsLoading.value = false;
    }
};

const isDisplayedBadge = (badge) => {
    return displayedBadgeCodes.value.includes(badge.code);
};

const selectedBadgeOrder = (badge) => {
    return displayedBadgeCodes.value.indexOf(badge.code) + 1;
};

const toggleDisplayedBadge = async (badge) => {
    if (!badge.unlocked) return;

    const previousCodes = [...displayedBadgeCodes.value];
    const existingIndex = displayedBadgeCodes.value.indexOf(badge.code);

    if (existingIndex !== -1) {
        displayedBadgeCodes.value.splice(existingIndex, 1);
    } else {
        if (displayedBadgeCodes.value.length >= 4) {
            toast.add({
                severity: 'warn',
                summary: 'Badge limit reached',
                detail: 'You can only display 4 badges at once.',
                life: 3000
            });
            return;
        }

        displayedBadgeCodes.value.push(badge.code);
    }

    try {
        await saveDisplayedBadges();
    } catch (err) {
        displayedBadgeCodes.value = previousCodes;

        toast.add({
            severity: 'error',
            summary: 'Unable to update badges',
            detail: err.response?.data?.error || err.message || 'Please try again.',
            life: 3000
        });
    }
};

const saveDisplayedBadges = async () => {
    const response = await apiRequest.put('/achievements/displayed', {
        codes: displayedBadgeCodes.value,
    });

    displayedBadgeCodes.value = (response.displayedAchievements || [])
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((badge) => badge.code);
};

const mergeUnlockedAchievements = (newAchievements = []) => {
    const normalized = normalizeAchievements(newAchievements);

    if (!normalized.length) return;

    if (!allAchievements.value.length) {
        loadAchievements();
        return;
    }

    const byCode = new Map(allAchievements.value.map((badge) => [badge.code, badge]));

    normalized.forEach((badge) => {
        const existing = byCode.get(badge.code) || {};

        byCode.set(badge.code, {
            ...existing,
            ...badge,
            goal: badge.goal || existing.goal || 1,
            progress: badge.progress || badge.goal || existing.goal || existing.progress || 1,
            unlocked: true
        });
    });

    allAchievements.value = Array.from(byCode.values()).sort(
        (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
};

const handleQrUpdated = () => {
    loadAchievements();
};

const onAchievementsUnlocked = ({ achievements = [] } = {}) => {
    mergeUnlockedAchievements(achievements);
};

watch(
    () => authStore.user?.id,
    (userId) => {
        if (userId) loadAchievements();
        else {
            allAchievements.value = [];
            displayedBadgeCodes.value = [];
        }
    },
    { immediate: true }
);
</script>

<style scoped>
.profile-screen {
    position: relative;
    height: 100dvh;
    overflow-y: auto;
    background: var(--bg-main);
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

.stats-strip {
    display: flex;
    align-items: center;
    margin-top: 12px;
    background: var(--bg-surface);
    border-radius: 18px;
    padding: 12px 0;
    width: 220px;
}

.stat-cell {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
}

.stat-value {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-main);
    white-space: nowrap;
}

.stat-label {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    white-space: nowrap;
}

.stat-divider {
    width: 1px;
    height: 30px;
    background: var(--divider-color);
    flex-shrink: 0;
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

/* Badges */
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
    background: transparent;
    border-radius: 14px;
    aspect-ratio: 1;
    max-width: 100px;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 8px;
}

.badge-slot:active {
    transform: scale(0.96);
}

.filled-badge-slot {
    border: none;
    /* background: var(--color-primary); */
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.18);
}

.plus-icon {
    font-size: 0.9rem;
}

.badge-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.badge-dialog-content {
    padding: 4px 0 10px;
}

.badge-helper-text {
    margin: 0 0 14px;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
}

.badge-error {
    margin: 0;
    color: #d32f2f;
    text-align: center;
    font-size: 0.85rem;
}

.badge-selection-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px 12px;
}

.badge-choice {
    position: relative;
    border: none;
    background: transparent;
    color: var(--text-main);
    padding: 0;
    min-width: 0;
    cursor: pointer;
    text-align: center;
}

.badge-choice:disabled {
    cursor: not-allowed;
}

.badge-choice-name {
    min-height: 28px;
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.05;
    display: flex;
    align-items: end;
    justify-content: center;
    margin-bottom: 4px;
}

.badge-choice-icon {
    position: relative;
    width: 76px;
    height: 76px;
    margin: 0 auto;
    border-radius: 14px;
    /* background: var(--color-primary); */
    padding: 0;
    overflow: hidden;
}

.badge-choice.selected .badge-choice-icon {
    outline: 3px solid #EF7C00;
}

.selected-order {
    position: absolute;
    top: 22px;
    right: 6px;
    z-index: 2;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: #EF7C00;
    color: #ffffff;
    font-size: 0.7rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
}

.badge-choice-description {
    margin-top: 6px;
    min-height: 28px;
    font-size: 0.68rem;
    line-height: 1.1;
    color: var(--text-muted);
}

.locked .badge-img {
    opacity: 0.58;
    filter: grayscale(1) brightness(0.72);
}

.locked-overlay {
    position: absolute;
    inset: 0;
    border-radius: 14px;
    background: rgba(66, 66, 66, 0.5);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.locked-overlay i {
    color: #ffffff;
    font-size: 1.35rem;
    text-shadow: 0 2px 6px rgba(0, 0, 0, 0.75);
}

.locked-progress-overlay {
    min-width: 42px;
    padding: 5px 9px;
    border-radius: 999px;
    background: rgba(66, 66, 66, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.7);
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 800;
    line-height: 1;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

:deep(.badge-select-dialog .p-dialog-header) {
    padding-bottom: 8px;
}

:deep(.badge-select-dialog .p-dialog-title) {
    width: 100%;
    text-align: center;
    color: var(--text-main);
    font-weight: 700;
}

:deep(.badge-select-dialog .p-dialog-content) {
    padding-top: 0;
}
</style>