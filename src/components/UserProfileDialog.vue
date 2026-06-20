<template>
    <Dialog v-model:visible="dialogVisible" modal dismissableMask :showHeader="false"
        :style="{ width: '88vw', maxWidth: '390px' }" :draggable="false" class="user-profile-dialog">
        <div class="user-profile-content">
            <button type="button" class="profile-close-btn" @click="dialogVisible = false">
                <i class="pi pi-times"></i>
            </button>
            <p v-if="errorMessage" class="profile-error">
                {{ errorMessage }}
            </p>

            <p v-else-if="loading" class="profile-loading">
                Loading profile...
            </p>

            <template v-else-if="profile">
                <div class="profile-header">
                    <div class="profile-pfp">
                        <img v-if="profile.pfpUrl" :src="profile.pfpUrl"
                            :alt="`${profile.username}'s profile picture`" />
                        <i v-else class="pi pi-user"></i>
                    </div>

                    <h3 class="profile-username">
                        {{ profile.username }}
                    </h3>
                </div>

                <div class="profile-stats">
                    <div class="profile-stat">
                        <span class="profile-stat-value">{{ memberSince }}</span>
                        <span class="profile-stat-label">Member Since</span>
                    </div>

                    <div class="profile-stat-divider"></div>

                    <div class="profile-stat">
                        <span class="profile-stat-value">{{ profile.deliveriesCompleted }}</span>
                        <span class="profile-stat-label">Deliveries</span>
                    </div>
                </div>

                <div class="profile-section">
                    <h4 class="profile-section-title">PayNow QR</h4>

                    <div class="qr-box">
                        <img v-if="profile.qrCodeUrl" :src="profile.qrCodeUrl" class="qr-img" alt="PayNow QR code" />

                        <div v-else class="empty-state">
                            <i class="pi pi-qrcode"></i>
                            <span>No PayNow QR uploaded</span>
                        </div>
                    </div>
                </div>

                <div class="profile-section">
                    <h4 class="profile-section-title">Badges</h4>

                    <div v-if="displayedBadges.length" class="displayed-badges-grid">
                        <div v-for="badge in displayedBadges" :key="badge.code" class="displayed-badge"
                            :title="badge.name">
                            <img :src="getBadgeIcon(badge)" :alt="badge.name" class="badge-img" />
                        </div>
                    </div>

                    <div v-else class="empty-state badges-empty">
                        <i class="pi pi-lock"></i>
                        <span>No badges displayed</span>
                    </div>
                </div>
            </template>
        </div>
    </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import Dialog from 'primevue/dialog';

import { apiRequest } from '../utils/api';
import { resolveFileUrl } from '../utils/fileUrl';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    username: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:visible']);

const loading = ref(false);
const errorMessage = ref('');
const profile = ref(null);

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

const dialogVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const normalizedUsername = computed(() => props.username?.replace(/^@/, '').trim() || '');

const displayedBadges = computed(() => {
    return Array.isArray(profile.value?.displayedBadges)
        ? profile.value.displayedBadges.slice(0, 4)
        : [];
});

const memberSince = computed(() => {
    if (!profile.value?.createdAt) return 'Unknown';

    return new Date(profile.value.createdAt).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
    });
});

const getBadgeIcon = (badge) => {
    return badgeIconMap[badge?.iconKey] || badgeIconMap[DEFAULT_BADGE_ICON_KEY];
};

const normalizeProfile = (rawProfile) => {
    if (!rawProfile) return null;

    return {
        ...rawProfile,
        createdAt: rawProfile.createdAt ?? rawProfile.created_at,
        pfpUrl: resolveFileUrl(rawProfile.pfpUrl ?? rawProfile.pfp_url),
        qrCodeUrl: resolveFileUrl(rawProfile.qrCodeUrl ?? rawProfile.paynowQrUrl ?? rawProfile.paynow_qr_url),
        deliveriesCompleted: Number(rawProfile.deliveriesCompleted ?? rawProfile.deliveries_completed ?? 0),
        displayedBadges: (rawProfile.displayedBadges ?? rawProfile.displayedAchievements ?? [])
            .map((badge) => ({
                ...badge,
                iconKey: badge.iconKey ?? badge.icon_key,
                displayOrder: badge.displayOrder ?? badge.display_order
            }))
            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
            .slice(0, 4)
    };
};

const loadProfile = async () => {
    if (!dialogVisible.value || !normalizedUsername.value) return;

    loading.value = true;
    errorMessage.value = '';
    profile.value = null;

    try {
        const response = await apiRequest.get(`/user/profile/${encodeURIComponent(normalizedUsername.value)}`);

        profile.value = normalizeProfile(response.user ?? response.profile);
    } catch (err) {
        profile.value = null;
        errorMessage.value = err.response?.data?.error || err.message || 'Failed to load user profile.';
    } finally {
        loading.value = false;
    }
};

watch(
    () => [dialogVisible.value, normalizedUsername.value],
    () => {
        if (dialogVisible.value) {
            loadProfile();
        }
    },
    { immediate: true }
);
</script>

<style scoped>
.user-profile-content {
    position: relative;
    min-height: 180px;
    padding-top: 30px;
}

.profile-close-btn {
    position: absolute;
    top: 10px;
    right: 0;
    width: 38px;
    height: 38px;
    border: none;
    background: var(--bg-surface);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2;
}

.profile-close-btn i {
    font-size: 1.4rem;
}

.profile-close-btn:active {
    transform: scale(0.94);
}

.profile-loading,
.profile-error {
    margin: 8px 0;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
}

.profile-error {
    color: var(--color-danger);
}

.profile-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.profile-pfp {
    width: 92px;
    height: 92px;
    border-radius: 50%;
    border: 3px solid var(--color-primary);
    background: #ffffff;
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.profile-pfp img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.profile-pfp i {
    font-size: 2.3rem;
}

.profile-username {
    margin: 0;
    color: var(--theme-blue);
    font-size: 1.2rem;
    font-weight: 800;
}

.profile-stats {
    display: flex;
    align-items: center;
    width: 230px;
    max-width: 100%;
    margin: 14px auto 18px;
    padding: 12px 0;
    border-radius: 18px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
}

.profile-stat {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    text-align: center;
}

.profile-stat-value {
    color: var(--text-main);
    font-size: 0.95rem;
    font-weight: 800;
    white-space: nowrap;
}

.profile-stat-label {
    color: var(--text-muted);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    white-space: nowrap;
}

.profile-stat-divider {
    width: 1px;
    height: 30px;
    background: var(--divider-color);
}

.profile-section {
    margin-top: 16px;
}

.profile-section-title {
    margin: 0 0 8px;
    color: var(--text-main);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-align: center;
    text-transform: uppercase;
}

.qr-box {
    width: 140px;
    height: 140px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    box-sizing: border-box;
}

.qr-img {
    display: block;
    width: 128px;
    height: 128px;
    max-width: 100%;
    object-fit: contain;
    border-radius: 12px;
    background: #ffffff;
}

.displayed-badges-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
}

.displayed-badge {
    aspect-ratio: 1;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.badge-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.empty-state {
    min-height: 100px;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
    font-size: 0.82rem;
}

.empty-state i {
    font-size: 1.5rem;
    opacity: 0.7;
}

.badges-empty {
    min-height: 74px;
    border-radius: 16px;
    background: var(--bg-card);
    border: 1px dashed var(--border-color);
}

:deep(.user-profile-dialog .p-dialog-header) {
    padding-bottom: 8px;
}

:deep(.user-profile-dialog .p-dialog-title) {
    width: 100%;
    text-align: center;
    color: var(--text-main);
    font-weight: 800;
}

:deep(.user-profile-dialog .p-dialog-content) {
    padding-top: 0;
}
</style>