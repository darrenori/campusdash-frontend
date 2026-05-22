import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const isAuthenticated = ref(false);
    const user = ref(null);

    function setLoggedIn(userData) {
        isAuthenticated.value = true;
        user.value = { ...userData, points: userData.points ?? 0 };
    }

    function logout() {
        isAuthenticated.value = false;
        user.value = null;
    }

    function adjustPoints(delta) {
        if (user.value != null) {
            user.value.points = (user.value.points ?? 0) + delta;
        }
    }

    return { isAuthenticated, user, setLoggedIn, logout, adjustPoints };
});