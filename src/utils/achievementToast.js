const normalizeAchievement = (achievement) => {
    if (!achievement) return null;

    return {
        ...achievement,
        iconKey: achievement.iconKey ?? achievement.icon_key,
        sortOrder: achievement.sortOrder ?? achievement.sort_order,
        unlockedAt: achievement.unlockedAt ?? achievement.unlocked_at,
    };
};

export const normalizeAchievements = (achievements = []) => {
    if (!Array.isArray(achievements)) return [];

    const seen = new Set();

    return achievements
        .map(normalizeAchievement)
        .filter(Boolean)
        .filter((achievement) => {
            const key = achievement.code || achievement.id || achievement.name;

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        });
};

export const showAchievementToasts = (toast, achievements = []) => {
    const normalized = normalizeAchievements(achievements);

    normalized.forEach((achievement) => {
        toast.add({
            severity: 'success',
            summary: 'Achievement unlocked!',
            detail: achievement.name,
            life: 5000,
        });
    });

    return normalized;
};