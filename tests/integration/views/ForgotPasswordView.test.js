import { mount, flushPromises } from '@vue/test-utils';
import ForgotPasswordView from '../../../src/views/ForgotPasswordView.vue';
import { apiRequest } from '../../../src/utils/api.js';

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
jest.mock('primevue/inputotp', () => ({ template: '<input/>' }));
jest.mock('primevue/password', () => ({ template: '<input type="password"/>' }));

const mockToastAdd = jest.fn();
jest.mock('primevue/usetoast', () => ({
    useToast: () => ({
        add: mockToastAdd,
    }),
}));

describe('ForgotPasswordView.vue', () => {
    let wrapper;

    beforeEach(() => {
        jest.clearAllMocks();
        wrapper = mount(ForgotPasswordView, {
            global: {
                stubs: { RouterLink: true },
            },
        });
    });

    afterEach(() => {
        wrapper.unmount();
    });

    describe('form validation states', () => {
        it('should enable the submit button when a valid email is entered', async () => {
            wrapper.vm.email = 'test@example.com';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeUndefined();
        });

        it('should keep the submit button disabled when fields are empty', () => {
            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
        });
    });

    describe('step 1: email', () => {
        it('should trigger loading state, send POST request, toast success, and move to step 2', async () => {
            let resolveApi;
            apiRequest.post.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve; }));

            wrapper.vm.email = 'test@example.com';
            await wrapper.vm.$nextTick();
            wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await wrapper.vm.$nextTick(); // isLoading = true

            expect(wrapper.vm.isLoading).toBe(true);
            expect(wrapper.find('.submit-btn').text()).toBe('Sending...');

            resolveApi({ message: 'Verification email has been sent to: test@example.com' });
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/forgot-password', {
                email: 'test@example.com',
            });

            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'OTP Sent',
                detail: 'Verification email has been sent to: test@example.com',
                life: 5000,
            });
            expect(wrapper.vm.currentStep).toBe(2);
            expect(wrapper.vm.isLoading).toBe(false);
        });

        it('should set errorMsg and clear loading state if the request fails', async () => {
            apiRequest.post.mockRejectedValueOnce(new Error('Please provide your email address.'));

            wrapper.vm.email = 'test@example.com';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();

            expect(wrapper.vm.isLoading).toBe(false);
            expect(wrapper.vm.currentStep).toBe(1);
            expect(wrapper.find('.error-msg').text()).toBe('Please provide your email address.');
        });
    });

    describe('step 2: OTP verification', () => {
        beforeEach(async () => {
            apiRequest.post.mockResolvedValueOnce({
                message: 'Verification email has been sent to: test@example.com',
            });

            wrapper.vm.email = 'test@example.com';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();
        });

        it('should trigger loading state, send the OTP, toast success, and move to step 3', async () => {
            let resolveApi;
            apiRequest.post.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve; }));

            wrapper.vm.otp = '123456';
            await wrapper.vm.$nextTick();
            wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await wrapper.vm.$nextTick(); // isLoading = true

            expect(wrapper.vm.isLoading).toBe(true);
            expect(wrapper.find('.submit-btn').text()).toBe('Verifying...');

            resolveApi({ message: 'OTP has been verified.' });
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/verify-otp', {
                email: 'test@example.com',
                otp: '123456',
            });
            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'OTP Verified',
                detail: 'Proceed to create new password.',
                life: 5000,
            });
            expect(wrapper.vm.currentStep).toBe(3);
            expect(wrapper.vm.isLoading).toBe(false);
        });

        it('should keep the submit button disabled when the OTP has fewer than 6 digits', async () => {
            wrapper.vm.otp = '123';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
        });

        it('should enable the submit button when the OTP is exactly 6 digits', async () => {
            wrapper.vm.otp = '123456';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeUndefined();
        });

        it('should set errorMsg and clear loading state if the request fails', async () => {
            apiRequest.post.mockRejectedValueOnce(new Error('Invalid OTP.'));

            wrapper.vm.otp = '111111';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();

            expect(wrapper.vm.currentStep).toBe(2);
            expect(wrapper.vm.isLoading).toBe(false);
            expect(wrapper.find('.error-msg').text()).toBe('Invalid OTP.');
        });

        it('should go back to step 1 when the back button is clicked', async () => {
            await wrapper.find('.back-btn').trigger('click');

            expect(wrapper.vm.currentStep).toBe(1);
        });
    });

    describe('step 3: password reset', () => {
        beforeEach(async () => {
            // Step 1: Submit email
            apiRequest.post.mockResolvedValueOnce({
                message: 'Verification email has been sent to: test@example.com',
            });
            wrapper.vm.email = 'test@example.com';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();

            // Step 2: Verify OTP
            apiRequest.post.mockResolvedValueOnce({ message: 'OTP has been verified.' });
            wrapper.vm.otp = '123456';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();
        });

        it('should trigger loading state, send POST request, toast success, and redirect to login', async () => {
            let resolveApi;
            apiRequest.post.mockReturnValueOnce(new Promise((resolve) => { resolveApi = resolve; }));

            wrapper.vm.password = 'newpassword123';
            wrapper.vm.confirmPassword = 'newpassword123';
            await wrapper.vm.$nextTick();
            wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await wrapper.vm.$nextTick(); // isLoading = true

            expect(wrapper.vm.isLoading).toBe(true);
            expect(wrapper.find('.submit-btn').text()).toBe('Updating Password...');

            resolveApi({ message: 'Password has been reset successfully. Please proceed to login.' });
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/reset-password', {
                email: 'test@example.com',
                otp: '123456',
                newPassword: 'newpassword123',
            });
            expect(mockToastAdd).toHaveBeenCalledWith({
                severity: 'success',
                summary: 'Password Updated',
                detail: 'Password has been reset successfully. Please proceed to login.',
                life: 5000,
            });
            expect(mockRouterPush).toHaveBeenCalledWith('/login');
            expect(wrapper.vm.isLoading).toBe(false);
        });

        it('should keep the submit button disabled when the password fields are empty', () => {
            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
        });

        it('should keep the submit button disabled when passwords do not match', async () => {
            wrapper.vm.password = 'newpassword123';
            wrapper.vm.confirmPassword = 'differentpassword';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeDefined();
        });

        it('should enable the submit button when passwords match and are non-empty', async () => {
            wrapper.vm.password = 'newpassword123';
            wrapper.vm.confirmPassword = 'newpassword123';
            await wrapper.vm.$nextTick();

            expect(wrapper.find('.submit-btn').attributes('disabled')).toBeUndefined();
        });


        it('should set errorMsg and clear loading state if the request fails', async () => {
            apiRequest.post.mockRejectedValueOnce(new Error('Invalid or expired OTP.'));

            wrapper.vm.password = 'newpassword123';
            wrapper.vm.confirmPassword = 'newpassword123';
            await wrapper.vm.$nextTick();
            await wrapper.find('.forgot-password-form').trigger('submit.prevent');
            await flushPromises();

            expect(wrapper.vm.isLoading).toBe(false);
            expect(mockRouterPush).not.toHaveBeenCalled();
            expect(wrapper.find('.error-msg').text()).toBe('Invalid or expired OTP.');
        });
    });
});