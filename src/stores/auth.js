import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiRequest } from '../utils/api';
import router from '../router';


export const useAuthStore = defineStore('auth', () => {
    const cachedUser = localStorage.getItem('userData');

    const isAuthenticated = ref(!!cachedUser); // force Boolean
    const user = ref(cachedUser ? JSON.parse(cachedUser) : null);

    function setLoggedIn(userData) {
        isAuthenticated.value = true;
        user.value = userData;
        localStorage.setItem('userData', JSON.stringify(userData));
    }

    async function logout() {
        try {
            await apiRequest.post('/auth/logout');
        } catch (err) {
            console.warn('Error occurred while logging out:', err);
        } finally {
            isAuthenticated.value = false;
            user.value = null;
            localStorage.removeItem('userData');
            router.push('/login');
        }
    }

    function adjustPoints(delta) {
        if (user.value != null) {
            user.value.points = (user.value.points ?? 0) + delta;
            localStorage.setItem('userData', JSON.stringify(user.value));
        }
    }

    function setPoints(points) {
        if (user.value != null && Number.isFinite(Number(points))) {
            user.value.points = Number(points);
            localStorage.setItem('userData', JSON.stringify(user.value));
        }
    }

    function incrementDeliveries() {
        if (user.value != null) {
            user.value.deliveries_completed = Number(user.value.deliveries_completed ?? 0) + 1;
            localStorage.setItem('userData', JSON.stringify(user.value));
        }
    }

    return { isAuthenticated, user, setLoggedIn, logout, adjustPoints, setPoints, incrementDeliveries };
});
