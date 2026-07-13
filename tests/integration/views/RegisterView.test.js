import { mount, flushPromises } from '@vue/test-utils';
import RegisterView from '../../../src/views/RegisterView.vue';
import { apiRequest } from '../../../src/utils/api.js';

jest.mock('../../../src/utils/api.js');

const mockRouterPush = jest.fn();

jest.mock('vue-router', () => ({
    createRouter: () => ({
        // Without this, we will get ReferenceError: Cannot access 'mockRouterPush' before initialization
        push: (...args) => mockRouterPush(...args),
        beforeEach: jest.fn(),
    }),
    createWebHistory: jest.fn(),
    useRouter: () => ({
        push: (...args) => mockRouterPush(...args),
    }),
}));

// Need to mock these or a bunch of errors will appear
jest.mock('../../../src/assets/top-waves-1.svg', () => 'top-waves-stub');
jest.mock('../../../src/assets/bottom-waves-1.svg', () => 'bottom-waves-stub');
jest.mock('../../../src/assets/logos/logo-full.svg', () => 'logo-full-stub');

// Tried to stub these but it gives "SyntaxError: Cannot use import statement outside a module"
jest.mock('primevue/iconfield', () => ({ template: '<div><slot/></div>' }));
jest.mock('primevue/inputicon', () => ({ template: '<i/>' }));
jest.mock('primevue/inputtext', () => ({ template: '<input/>' }));
jest.mock('primevue/inputotp', () => ({ template: '<input/>' }));
jest.mock('primevue/password', () => ({ template: '<input type="password"/>' }));

const mockToastAdd = jest.fn();
jest.mock('primevue/usetoast', () => ({
    useToast: () => ({
        add: mockToastAdd,
    }),
}));

describe('RegisterView.vue', () => {
    let wrapper;

    // https://test-utils.vuejs.org/api/
    beforeEach(() => {
        jest.clearAllMocks();
        wrapper = mount(RegisterView, {
            global: {
                // https://test-utils.vuejs.org/guide/advanced/stubs-shallow-mount.html
                // Instead of showing the implementation of the subcomponents, it will show up as
                // TLDR e.g. <input-text-stub></input-text-stub>
                // Mainly for simplification and isolation
                stubs: { RouterLink: true },
            },
        });
    });

    afterEach(() => {
        wrapper.unmount();
    });

    describe('form validation states', () => {
        it('should enable the submit button when all fields are populated with matching passwords', async () => {
            wrapper.vm.username = 'newuser';
            wrapper.vm.email = 'newuser@u.nus.edu';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeUndefined();
        });

        it('should keep the submit button disabled when fields are empty', () => {
            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
        });

        it('should disable the submit button if password and confirmPassword are mismatched', async () => {
            wrapper.vm.username = 'newuser';
            wrapper.vm.email = 'newuser@u.nus.edu';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password456';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.error-msg').text()).toBe('Passwords do not match.');
        });

        it('should keep the submit button disabled for non-NUS email addresses', async () => {
            wrapper.vm.username = 'newuser';
            wrapper.vm.email = 'newuser@example.com';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.error-msg').text()).toBe('Registration requires a @u.nus.edu email address.');
        });

        it('should keep the submit button disabled when username contains @', async () => {
            wrapper.vm.username = 'new@user';
            wrapper.vm.email = 'newuser@u.nus.edu';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
        });

        it('should keep the submit button disabled when password does not meet policy', async () => {
            wrapper.vm.username = 'newuser';
            wrapper.vm.email = 'newuser@u.nus.edu';
            wrapper.vm.password = 'password123';
            wrapper.vm.confirmPassword = 'password123';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.error-msg').text()).toBe('Password must be at least 8 characters and include uppercase, lowercase, and number.');
        });

        it('should explain why the submit button is disabled when required fields are missing', async () => {
            wrapper.vm.username = 'newuser';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.register-btn').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.error-msg').text()).toBe('Fill in all fields to continue.');
        });
    });

    describe('username length constraints', () => {
        it('should block submission and show an error if username exceeds 20 characters', async () => {
            wrapper.vm.username = 'thisisaverylongusername1234567890';
            wrapper.vm.email = 'lengthtest@u.nus.edu';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            await wrapper.find('.register-form').trigger('submit.prevent');

            expect(apiRequest.post).not.toHaveBeenCalled();
            expect(wrapper.find('.error-msg').text()).toBe('Username cannot exceed 20 characters.');
        });
    });

    describe('registration flows', () => {
        it('should trigger loading state, send POST request, toast success, and show OTP step', async () => {
            let resolveApi;
            apiRequest.post.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve; }));

            wrapper.vm.username = '  newuser   ';
            wrapper.vm.email = 'newuser@u.nus.edu  ';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            wrapper.find('.register-form').trigger('submit.prevent');
            await wrapper.vm.$nextTick(); // isLoading = true

            expect(wrapper.vm.isLoading).toBe(true);
            expect(wrapper.find('.register-btn').text()).toBe('Sending...');

            resolveApi({ message: 'Verification email has been sent to: newuser@u.nus.edu' }); // Fulfillment
            await flushPromises(); // API call ends

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/register', {
                username: 'newuser',
                email: 'newuser@u.nus.edu',
                password: 'Password123',
            });
            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'OTP Sent',
                detail: 'Verification email has been sent to: newuser@u.nus.edu',
                life: 5000,
            });
            expect(wrapper.vm.currentStep).toBe(2);
            expect(mockRouterPush).not.toHaveBeenCalled();
            expect(wrapper.vm.isLoading).toBe(false);
        });

        it('should verify OTP, toast success, and redirect to login', async () => {
            apiRequest.post.mockResolvedValueOnce({ message: 'User registered successfully. Please proceed to login.' });

            wrapper.vm.currentStep = 2;
            wrapper.vm.email = 'newuser@u.nus.edu';
            wrapper.vm.otp = '123456';
            await wrapper.vm.$nextTick();

            await wrapper.find('.register-form').trigger('submit.prevent');
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/register/verify-otp', {
                email: 'newuser@u.nus.edu',
                otp: '123456',
            });
            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Account Registered!',
                detail: 'User registered successfully. Please proceed to login.',
                life: 5000,
            });
            expect(mockRouterPush).toHaveBeenCalledWith('/login');
        });

        it('should set errorMsg and clear loading state if the request fails', async () => {
            apiRequest.post.mockRejectedValueOnce(new Error('This email is already registered.'));

            wrapper.vm.username = 'newuser';
            wrapper.vm.email = 'existinguser@u.nus.edu';
            wrapper.vm.password = 'Password123';
            wrapper.vm.confirmPassword = 'Password123';
            await wrapper.vm.$nextTick(); // Recalculate isSubmitDisabled

            await wrapper.find('.register-form').trigger('submit.prevent');
            await flushPromises(); // API call ends

            expect(wrapper.vm.isLoading).toBe(false);
            expect(wrapper.find('.register-btn').text()).toBe('Send Verification Code');
            expect(wrapper.find('.error-msg').text()).toBe('This email is already registered.');
        });
    });
});