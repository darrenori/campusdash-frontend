const BASE_URL = import.meta.env.VITE_BACKEND_URL;
import { useAuthStore } from "../stores/auth";
import router from "../router";

export const apiRequest = {
    async get(endpoint) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'GET',
            credentials: 'include'
        });

        // Handle expired/invalid sessions
        if (response.status === 401) {
            const authStore = useAuthStore();
            authStore.logout();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }

        return result;
    },

    async post(endpoint, data) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        // Handle expired/invalid sessions
        if (response.status === 401 && endpoint !== '/auth/login') {
            const authStore = useAuthStore();
            authStore.logout();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }

        return result;
    },

    async put(endpoint, data, config = { autoLogout: true }) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        // Only log out if the request explicitly allows autoLogout
        if (response.status === 401 && config.autoLogout) {
            const authStore = useAuthStore();
            authStore.logout();
            router.push('/login');
            throw new Error('Session expired. Please log in again.');
        }

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }

        return result;
    }
};