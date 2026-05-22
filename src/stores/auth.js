import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
    const cachedUser = localStorage.getItem('userData');

    const isAuthenticated = ref(!!cachedUser); // force Boolean
    const user = ref(cachedUser ? JSON.parse(cachedUser) : null);

    function setLoggedIn(userData) {
        isAuthenticated.value = true;
        user.value = userData;
        localStorage.setItem('userData', JSON.stringify(userData));
    }

    function logout() {
        isAuthenticated.value = false;
        user.value = null;
        localStorage.removeItem('userData');
    }

    return { isAuthenticated, user, setLoggedIn, logout };
});