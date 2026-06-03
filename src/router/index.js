import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiRequest } from '../utils/api';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    // use 'requiresAuth' meta field to indicate which routes require authentication
    routes: [
        {
            path: '/',
            name: 'dashboard',
            component: () => import('../views/DashboardView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/discover',
            redirect: '/'
        },
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/LoginView.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/register',
            name: 'register',
            component: () => import('../views/RegisterView.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/forgot-password',
            name: 'forgot-password',
            component: () => import('../views/ForgotPasswordView.vue'),
            meta: { requiresAuth: false }
        },
        {
            path: '/profile',
            name: 'profile',
            component: () => import('../views/ProfileView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/request',
            name: 'request',
            component: () => import('../views/RequestView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/history',
            name: 'history',
            component: () => import('../views/HistoryView.vue'),
            meta: { requiresAuth: true }
        },
        {
            path: '/messages',
            redirect: '/'
        },
        {
            path: '/:pathMatch(.*)*',
            redirect: '/'
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
            } else {
                authStore.logout();
            }
        } catch (err) {
            console.log('No active cookie session found.');
        } finally {
            hasCheckedAuth = true;
        }
    }

    const isPublic = to.meta.requiresAuth === false;

    if (!isPublic && !authStore.isAuthenticated) {
        // Entering protected page while logged out
        return '/login';
    }

    if (isPublic && authStore.isAuthenticated) {
        // Revisiting Login/Register screen while logged in
        return '/';
    }
});

export default router;
