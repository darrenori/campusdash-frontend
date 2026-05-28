import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import RequestView from '../../src/views/RequestView.vue';
import { apiRequest } from '../../src/utils/api.js';

//mock
const mockRouterReplace = jest.fn();

jest.mock('vue-router', () => ({
    createRouter: () => ({ push: jest.fn(), replace: jest.fn(), beforeEach: jest.fn() }),
    createWebHistory: jest.fn(),
    useRouter: () => ({
        push: jest.fn(),
        replace: (...args) => mockRouterReplace(...args),
    }),
}));

jest.mock('../../src/router/index.js', () => ({
    __esModule: true,
    default: { push: jest.fn(), replace: jest.fn(), beforeEach: jest.fn() },
}));

const mockToastAdd = jest.fn();
jest.mock('primevue/usetoast', () => ({
    useToast: () => ({ add: mockToastAdd }),
}));

// return fresh mock
jest.mock('../../src/utils/socket.js', () => ({
    getSocket: () => ({ on: jest.fn(), off: jest.fn(), emit: jest.fn() }),
}));

jest.mock('../../src/utils/api.js');
jest.mock('../../src/assets/logos/logo-square.svg', () => 'logo-stub');

//helper
const DEFAULT_USER = { id: 1, username: 'tester', points: 5 };

const MOCK_LOCATIONS = [
    { id: 1, name: 'LT28' }, { id: 2, name: 'LT27' }, { id: 3, name: 'LT29' },
    { id: 4, name: 'LT1' },  { id: 5, name: 'LT13' }, { id: 6, name: 'COM1' },
    { id: 7, name: 'COM2' }, { id: 8, name: 'AS6' },  { id: 9, name: 'S16' },
    { id: 10, name: 'UTown' },
];

function setupApiMocks(activeRequest = null) {
    apiRequest.get.mockImplementation((endpoint) => {
        if (endpoint === '/requests/active') return Promise.resolve({ request: activeRequest });
        if (endpoint === '/catalog')          return Promise.resolve({ canteens: [] });
        if (endpoint === '/locations')        return Promise.resolve({ locations: MOCK_LOCATIONS });
        return Promise.resolve({});
    });
}

async function mountView(activeRequest = null) {
    setupApiMocks(activeRequest);
    const wrapper = mount(RequestView, {
        global: { stubs: { BottomNav: true } },
    });
    await flushPromises();
    return wrapper;
}

//tests
describe('RequestView.vue', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('userData', JSON.stringify(DEFAULT_USER));
        setActivePinia(createPinia());
        jest.clearAllMocks();
    });

    //interceptors
    describe('form pre-flight interceptors', () => {
        it('blocks submit and shows an error when delivery location is not in the allowed list', async () => {
            const wrapper = await mountView();
            wrapper.vm.form.deliveryLocation = 'NOWHERE_CAMPUS';
            wrapper.vm.form.item = 'Kopi';

            await wrapper.find('.req-form').trigger('submit.prevent');

            expect(apiRequest.post).not.toHaveBeenCalled();
            expect(wrapper.find('.form-error').text()).toBe('Please choose a listed delivery location.');
        });

        it('blocks submit and shows an error when user has 0 points', async () => {
            localStorage.clear();
            localStorage.setItem('userData', JSON.stringify({ ...DEFAULT_USER, points: 0 }));
            setActivePinia(createPinia());
            setupApiMocks(null);

            const wrapper = mount(RequestView, {
                global: { stubs: { BottomNav: true } },
            });
            await flushPromises();
            wrapper.vm.form.item = 'Kopi';

            await wrapper.find('.req-form').trigger('submit.prevent');

            expect(apiRequest.post).not.toHaveBeenCalled();
            expect(wrapper.find('.form-error').text()).toBe('You need at least 1 point to request an order.');
        });

        //check unsupported characters and links
        it('blocks submit and shows an error when item contains unsupported characters', async () => {
            const wrapper = await mountView();
            wrapper.vm.form.item = 'Kopi <bad>';

            await wrapper.find('.req-form').trigger('submit.prevent');

            expect(apiRequest.post).not.toHaveBeenCalled();
            expect(wrapper.find('.form-error').text()).toBe('Please remove links or unsupported characters from your request.');
        });

        //check urls in desc
        it('blocks submit and shows an error when item contains a URL', async () => {
            const wrapper = await mountView();
            wrapper.vm.form.item = 'https://attacker.example/payload';

            await wrapper.find('.req-form').trigger('submit.prevent');

            expect(apiRequest.post).not.toHaveBeenCalled();
            expect(wrapper.find('.form-error').text()).toBe('Please remove links or unsupported characters from your request.');
        });

        
        it('calls the API when all validation guards pass', async () => {
            apiRequest.post.mockResolvedValueOnce({
                request: {
                    id: 42, status: 'open',
                    requester: { id: 1, name: 'tester' }, deliverer: null,
                    item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
                },
            });

            const wrapper = await mountView();
            wrapper.vm.form.item = 'Kopi';

            await wrapper.find('.req-form').trigger('submit.prevent');
            await flushPromises();

            expect(apiRequest.post).toHaveBeenCalledWith('/requests', expect.objectContaining({
                deliveryLocation: 'LT28',
                item: 'Kopi',
            }));
        });
    });

    //timeline transition
    describe('multi-step timeline transitions', () => {
        it('shows the request form when there is no active request', async () => {
            const wrapper = await mountView(null);
            expect(wrapper.find('.req-form').exists()).toBe(true);
            expect(wrapper.find('.status-panel').exists()).toBe(false);
        });

        it('shows the status panel (not the form) when there is an active request', async () => {
            const activeReq = {
                id: 1, status: 'open',
                requester: { id: 1, name: 'tester' }, deliverer: null,
                item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
            };
            const wrapper = await mountView(activeReq);
            expect(wrapper.find('.req-form').exists()).toBe(false);
            expect(wrapper.find('.status-panel').exists()).toBe(true);
        });

        it('shows "Finding Runner..." when the request is open with no deliverer', async () => {
            const activeReq = {
                id: 1, status: 'open',
                requester: { id: 1, name: 'tester' }, deliverer: null,
                item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
            };
            const wrapper = await mountView(activeReq);
            expect(wrapper.text()).toContain('Finding Runner...');
            expect(wrapper.text()).not.toContain('Runner Found');
        });

        it('shows "Runner Found" when the request is accepted with an assigned deliverer', async () => {
            const activeReq = {
                id: 1, status: 'accepted',
                requester: { id: 1, name: 'tester' },
                deliverer: { id: 2, name: 'runner' },
                item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
            };
            const wrapper = await mountView(activeReq);
            expect(wrapper.text()).toContain('Runner Found');
            expect(wrapper.text()).not.toContain('Finding Runner...');
        });

        it('shows "Request Submitted" when the current user is the requester', async () => {
            const activeReq = {
                id: 1, status: 'open',
                requester: { id: 1, name: 'tester' }, // matches DEFAULT_USER.id
                deliverer: null,
                item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
            };
            const wrapper = await mountView(activeReq);
            expect(wrapper.text()).toContain('Request Submitted');
            expect(wrapper.text()).not.toContain('Delivery Accepted');
        });

        it('shows "Delivery Accepted" when the current user is the deliverer', async () => {
            const activeReq = {
                id: 1, status: 'accepted',
                requester: { id: 99, name: 'other' },
                deliverer: { id: 1, name: 'tester' }, // matches DEFAULT_USER.id
                item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
            };
            const wrapper = await mountView(activeReq);
            expect(wrapper.text()).toContain('Delivery Accepted');
            expect(wrapper.text()).not.toContain('Request Submitted');
        });
    });

    //cancelation penalties
    describe('cancellation penalties', () => {
        const openRequest = {
            id: 1, status: 'open',
            requester: { id: 1, name: 'tester' }, deliverer: null,
            item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
        };

        const acceptedRequest = {
            id: 1, status: 'accepted',
            requester: { id: 1, name: 'tester' },
            deliverer: { id: 2, name: 'runner' },
            item: 'Kopi', canteen: 'YIH', deliveryLocation: 'LT28',
        };

        it('opens the cancel panel and shows the penalty warning when a runner is matched', async () => {
            const wrapper = await mountView(acceptedRequest);

            await wrapper.find('.cancel-btn').trigger('click');

            expect(wrapper.find('.cancel-penalty').exists()).toBe(true);
            expect(wrapper.find('.cancel-penalty').text()).toContain('you will lose 1 point');
        });

        it('does not open the cancel panel when the request has no runner yet', async () => {
            apiRequest.patch.mockResolvedValueOnce({ points: 4 });
            const wrapper = await mountView(openRequest);

            await wrapper.find('.cancel-btn').trigger('click');

            expect(wrapper.find('.cancel-penalty').exists()).toBe(false);

            await flushPromises();
        });

        it('blocks cancellation and shows an error when the reason textarea is empty', async () => {
            const wrapper = await mountView(acceptedRequest);

            // Open the cancel panel
            await wrapper.find('.cancel-btn').trigger('click');

            //confirm cancel, no reason
            await wrapper.find('.cancel-btn.compact').trigger('click');

            expect(apiRequest.patch).not.toHaveBeenCalled();
            expect(wrapper.find('.form-error').text()).toBe('Please add a reason before cancelling.');
        });

        it('calls the cancel API with the provided reason when one is entered', async () => {
            apiRequest.patch.mockResolvedValueOnce({ points: 4 });
            const wrapper = await mountView(acceptedRequest);

            await wrapper.find('.cancel-btn').trigger('click');

            wrapper.vm.cancelReason = 'Running late, cannot make it';
            await wrapper.vm.$nextTick();

            await wrapper.find('.cancel-btn.compact').trigger('click');
            await flushPromises();

            expect(apiRequest.patch).toHaveBeenCalledWith('/requests/1/cancel', {
                reason: 'Running late, cannot make it',
            });
        });
    });
});
