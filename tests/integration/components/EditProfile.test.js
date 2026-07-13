import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import EditProfile from '../../../src/components/EditProfile.vue';

jest.mock('vue-router', () => ({
    createRouter: () => ({
        push: jest.fn(),
        beforeEach: jest.fn(),
    }),
    createWebHistory: jest.fn(),
}));

jest.mock('primevue/dialog', () => ({ template: '<div><slot/></div>' }));
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

jest.mock('../../../src/utils/api.js', () => ({
    apiRequest: {
        put: jest.fn(),
        postFormData: jest.fn(),
    },
}));

describe('EditProfile.vue', () => {
    let wrapper;

    const mountComponent = () => {
        const pinia = createPinia();
        setActivePinia(pinia);

        wrapper = mount(EditProfile, {
            props: {
                visible: true,
                userData: {
                    username: 'testuser',
                    email: 'testuser@u.nus.edu',
                    pfpUrl: null,
                },
            },
            global: {
                plugins: [pinia],
                stubs: {
                    PasswordRequirementsHint: true,
                },
            },
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mountComponent();
    });

    afterEach(() => {
        wrapper.unmount();
    });

    it('should not show a validation error before the user starts editing', () => {
        expect(wrapper.find('.update-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.error-msg').exists()).toBe(false);
    });

    it('should explain that required fields are missing after editing starts', async () => {
        wrapper.vm.form.username = 'updateduser';
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.update-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.error-msg').text()).toBe('Fill in all required fields to continue.');
    });

    it('should explain that usernames cannot contain @', async () => {
        wrapper.vm.form.username = 'new@user';
        wrapper.vm.form.currentPassword = 'CurrentPassword123';
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.update-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.error-msg').text()).toBe('Username cannot contain @.');
    });

    it('should explain when a new password does not meet policy', async () => {
        wrapper.vm.form.currentPassword = 'CurrentPassword123';
        wrapper.vm.form.newPassword = 'password123';
        wrapper.vm.form.confirmPassword = 'password123';
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.update-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.error-msg').text()).toBe('Password must be at least 8 characters and include uppercase, lowercase, and number.');
    });

    it('should explain when new password confirmation does not match', async () => {
        wrapper.vm.form.currentPassword = 'CurrentPassword123';
        wrapper.vm.form.newPassword = 'Password123';
        wrapper.vm.form.confirmPassword = 'Password456';
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.update-btn').attributes('disabled')).toBeDefined();
        expect(wrapper.find('.error-msg').text()).toBe('Passwords do not match.');
    });
});
