import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

import DashboardView from '../views/DashboardView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';

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

// Redirect users back to login if they visit a protected route without being authenticated
router.beforeEach((to, from, next) => {
    const authStore = useAuthStore();

    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
        next('/login');
    } else {
        next();
    }
});

export default router;
