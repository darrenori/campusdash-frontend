import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LoginView from '../../../src/views/LoginView.vue';
import { apiRequest } from '../../../src/utils/api.js';
import { useAuthStore } from '../../../src/stores/auth.js';

jest.mock('../../../src/utils/api.js');

const mockRouterPush = jest.fn();

jest.mock('vue-router', () => ({
    createRouter: () => ({
        push: (...args) => mockRouterPush(...args),
        beforeEach: jest.fn(),
    }),
    createWebHistory: jest.fn(),
    useRouter: () => ({
        push: (...args) => mockRouterPush(...args),
    }),
}));

jest.mock('../../../src/assets/top-waves-1.svg', () => 'top-waves-stub');
jest.mock('../../../src/assets/bottom-waves-1.svg', () => 'bottom-waves-stub');
jest.mock('../../../src/assets/logos/logo-full.svg', () => 'logo-full-stub');

jest.mock('primevue/iconfield', () => ({ template: '<div><slot/></div>' }));
jest.mock('primevue/inputicon', () => ({ template: '<i/>' }));
jest.mock('primevue/inputtext', () => ({ template: '<input/>' }));
jest.mock('primevue/password', () => ({ template: '<input type="password"/>' }));

const mockToastAdd = jest.fn();
jest.mock('primevue/usetoast', () => ({
    useToast: () => ({
        add: mockToastAdd,
    }),
}));

describe('LoginView.vue', () => {
    let wrapper;
    let authStore;

    const mockUser = {
        "id": 1,
        "username": "test",
        "email": "test@example.com",
        "points": 100,
        "pfp_url": null,
        "paynow_qr_url": null,
        "created_at": "1970-01-01T00:00:00.000Z"
    };

    beforeEach(() => {
        jest.clearAllMocks();

        const pinia = createPinia();
        setActivePinia(pinia);
        authStore = useAuthStore();
        jest.spyOn(authStore, 'setLoggedIn').mockImplementation(() => { });

        wrapper = mount(LoginView, {
            global: {
                plugins: [pinia],
                stubs: { RouterLink: true },
            },
        });
    });

    afterEach(() => {
        wrapper.unmount();
    });

    describe('form validation states', () => {
        it('should enable the submit button when both username and password fields are filled', async () => {
            wrapper.vm.username = 'test';
            wrapper.vm.password = 'password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            expect(wrapper.find('.login-btn').attributes('disabled')).toBeUndefined();
        });

        it('should keep the submit button disabled when fields are empty', () => {
            expect(wrapper.find('.login-btn').attributes('disabled')).toBeDefined();
        });
    });

    describe('login flows', () => {
        it('should trigger loading state, send POST request, toast success, update store, and redirect to dashboard', async () => {
            let resolveApi;
            apiRequest.post.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve; }));

            wrapper.vm.username = 'test';
            wrapper.vm.password = 'password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            wrapper.find('.login-form').trigger('submit.prevent');
            await wrapper.vm.$nextTick(); // isLoading = true

            expect(wrapper.vm.isLoading).toBe(true);
            expect(wrapper.find('.login-btn').text()).toBe('Logging in...');

            resolveApi({ user: mockUser });
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/login', {
                username: 'test',
                password: 'password123',
            });

            expect(authStore.setLoggedIn).toHaveBeenCalledWith(mockUser);

            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Login Successful!',
                detail: 'Welcome back, test!',
                life: 5000,
            });

            expect(mockRouterPush).toHaveBeenCalledWith('/');
            expect(wrapper.vm.isLoading).toBe(false);
        });

        it('should submit an email identifier without truncating it', async () => {
            apiRequest.post.mockResolvedValueOnce({ user: mockUser });

            wrapper.vm.username = 'testuser@u.nus.edu';
            wrapper.vm.password = 'Password123';
            await wrapper.vm.$nextTick();

            await wrapper.find('.login-form').trigger('submit.prevent');
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/login', {
                username: 'testuser@u.nus.edu',
                password: 'Password123',
            });
        });

        it('should set errorMsg and clear loading state if the request fails', async () => {
            apiRequest.post.mockRejectedValueOnce(new Error('Invalid username or password.'));

            wrapper.vm.username = 'test';
            wrapper.vm.password = 'wrongpassword';
            await wrapper.vm.$nextTick();

            await wrapper.find('.login-form').trigger('submit.prevent');
            await flushPromises();

            expect(wrapper.vm.isLoading).toBe(false);
            expect(wrapper.find('.login-btn').text()).toBe('Login');
            expect(wrapper.find('.error-msg').text()).toBe('Invalid username or password.');
        });
    });
});