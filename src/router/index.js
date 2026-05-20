import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import { apiRequest } from '../utils/api';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    // use 'requiresAuth' meta field to indicate which routes require authentication
    routes: [
        {
            path: '/',
            name: 'dashboard',
            component: DashboardView,
            meta: { requiresAuth: true }
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView,
            meta: { requiresAuth: false }
        },
        {
            path: '/register',
            name: 'register',
            component: RegisterView,
            meta: { requiresAuth: false }
        },
        {
            path: '/forgot-password',
            name: 'forgot-password',
            component: ForgotPasswordView,
            meta: { requiresAuth: false }
        },
        {
            path: '/profile',
            name: 'profile',
            component: ProfileView,
            meta: { requiresAuth: true }
        }
    ]
});

let hasCheckedAuth = false;

// Redirect users back to login if they visit a protected route without being authenticated
router.beforeEach(async (to, from) => {
    const authStore = useAuthStore();

    // Check cookie validity before proceding
    if (!hasCheckedAuth) {
        try {
            const response = await apiRequest.get('/auth/me');
            if (response.authenticated) {
                authStore.setLoggedIn(response.user);
            }
        } catch (err) {
            console.log('No active cookie session found.');
        } finally {
            hasCheckedAuth = true;
        }
    }

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        // Entering protected page while logged out
        return '/login';
    }

    if (to.meta.requiresAuth === false && authStore.isAuthenticated) {
        // Revisiting Login/Register screen while logged in
        return '/';
    }
});

export default router;
