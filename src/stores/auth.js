import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const isAuthenticated = ref(false);
    const user = ref(null);

    function setLoggedIn(userData) {
        isAuthenticated.value = true;
        user.value = userData;
    }

    function logout() {
        isAuthenticated.value = false;
        user.value = null;
    }

    return { isAuthenticated, user, setLoggedIn, logout };
});