import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

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

jest.mock('../../../src/utils/api.js', () => ({
    apiRequest: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

import DeliveryRequestDrawer from '../../../src/components/DeliveryRequestDrawer.vue';
import CancelPanel from '../../../src/components/CancelPanel.vue';
import { useAuthStore } from '../../../src/stores/auth.js';

const buyer = {
    id: 2,
    name: 'testBuyer',
    pfpUrl: null,
};

const runner = {
    id: 1,
    name: 'testRunner',
    pfpUrl: null,
};

function createRequest(overrides = {}) {
    return {
        id: 100,
        deliveryLocation: 'LT28',
        deliveryLocationId: 37,

        canteen: 'Frontier',
        canteenId: 3,

        stall: "Chef's Wok",
        stallId: 25,

        item: 'ddd',
        specialRequest: 'test',
        deliveryInfo: 'test',

        status: 'open',

        requester: buyer,
        deliverer: null,

        pickupCoords: {
            lat: 1.2968,
            lng: 103.7803,
        },

        deliveryCoords: {
            lat: 1.297473646481507,
            lng: 103.7812157830612,
        },

        collectedAt: null,
        deliveredAt: null,
        createdAt: '1970-01-01T00:00:00.000Z',

        ...overrides,
    };
}

function createAcceptedRequest(overrides = {}) {
    return createRequest({
        status: 'accepted',
        deliverer: runner,
        ...overrides,
    });
}

function createSameDestinationRequests() {
    const request = createRequest();
    const secondRequest = createRequest({
        id: 101,
        stall: 'Thai',
        stallId: 26,
        item: 'Iced kopi',
    });

    return {
        request,
        secondRequest,
        destinationRequests: [request, secondRequest],
    };
}

function mountDrawer({
    request = createRequest(),
    user = buyer,
    props = {},
} = {}) {
    const pinia = createPinia();
    setActivePinia(pinia);

    const authStore = useAuthStore();
    authStore.user = user;

    return mount(DeliveryRequestDrawer, {
        props: {
            visible: true,
            request,
            accepting: false,
            active: false,
            cancelling: false,
            completing: false,
            runnerOnline: false,
            ...props,
        },
        global: {
            plugins: [pinia],
        },
    });
}

describe('DeliveryRequestDrawer.vue', () => {
    let wrapper;

    beforeEach(() => {
        jest.clearAllMocks();

        Object.defineProperty(navigator, 'clipboard', {
            value: {
                writeText: jest.fn().mockResolvedValue(undefined),
            },
            configurable: true,
        });
    });

    afterEach(() => {
        wrapper?.unmount();
    });

    describe('before accepting an order', () => {
        it('shows the stall to destination route', () => {
            wrapper = mountDrawer();

            expect(wrapper.text()).toContain("Frontier - Chef's Wok -> LT28");
        });

        it('cycles between orders going to the same destination', async () => {
            const { request, secondRequest, destinationRequests } = createSameDestinationRequests();

            wrapper = mountDrawer({
                request,
                props: {
                    destinationRequests,
                },
            });

            expect(wrapper.find('.order-switcher-label').text()).toBe('Order 1 of 2');

            await wrapper.findAll('.order-switcher-btn')[1].trigger('click');

            expect(wrapper.emitted('select-request')).toHaveLength(1);
            expect(wrapper.emitted('select-request')[0]).toEqual([secondRequest]);
        });

        it('keeps the drawer expanded when switching between same-destination orders', async () => {
            const { request, secondRequest, destinationRequests } = createSameDestinationRequests();

            wrapper = mountDrawer({
                request,
                props: {
                    destinationRequests,
                },
            });

            wrapper.vm.$.setupState.isExpanded = true;
            await nextTick();

            expect(wrapper.find('.delivery-drawer').classes()).toContain('expanded');

            await wrapper.findAll('.order-switcher-btn')[1].trigger('click');
            await wrapper.setProps({
                request: secondRequest,
                destinationRequests,
            });

            expect(wrapper.find('.delivery-drawer').classes()).toContain('expanded');
        });

        it('keeps the drawer expanded when a different map pin is selected', async () => {
            const request = createRequest();
            const secondRequest = createRequest({
                id: 102,
                deliveryLocation: 'The Deck',
                deliveryLocationId: 6,
                stall: 'Western',
                stallId: 30,
                item: 'Pasta',
            });

            wrapper = mountDrawer({ request });

            wrapper.vm.$.setupState.isExpanded = true;
            await nextTick();

            await wrapper.setProps({
                request: secondRequest,
                destinationRequests: [secondRequest],
            });

            expect(wrapper.find('.delivery-drawer').classes()).toContain('expanded');
        });

        it('swipes the collapsed drawer header to the next same-destination order', () => {
            const { request, secondRequest, destinationRequests } = createSameDestinationRequests();

            wrapper = mountDrawer({
                request,
                props: {
                    destinationRequests,
                },
            });

            wrapper.vm.$.setupState.startCollapsedOrderSwipe({
                clientX: 220,
                clientY: 80,
                target: wrapper.find('.requester-block').element,
            });
            wrapper.vm.$.setupState.endCollapsedOrderSwipe({
                clientX: 140,
                clientY: 84,
            });

            expect(wrapper.emitted('select-request')).toHaveLength(1);
            expect(wrapper.emitted('select-request')[0]).toEqual([secondRequest]);
        });

        it('does not swipe orders from the expanded drawer header', async () => {
            const { request, destinationRequests } = createSameDestinationRequests();

            wrapper = mountDrawer({
                request,
                props: {
                    destinationRequests,
                },
            });

            wrapper.vm.$.setupState.isExpanded = true;
            await nextTick();

            wrapper.vm.$.setupState.startCollapsedOrderSwipe({
                clientX: 220,
                clientY: 80,
                target: wrapper.find('.requester-block').element,
            });
            wrapper.vm.$.setupState.endCollapsedOrderSwipe({
                clientX: 140,
                clientY: 84,
            });

            expect(wrapper.emitted('select-request')).toBeUndefined();
        });

        it('shows accept buttons before accepting an order', () => {
            wrapper = mountDrawer({
                request: createRequest({
                    status: 'open',
                    deliverer: null,
                }),
            });

            expect(wrapper.find('.unexpanded-accept-btn').exists()).toBe(true);
            expect(wrapper.find('.unexpanded-accept-btn').text()).toBe('ACCEPT');

            expect(wrapper.find('.accept-btn').exists()).toBe(true);
            expect(wrapper.find('.accept-btn').text()).toBe('ACCEPT');
        });

        it('emits accept when the header accept button is clicked', async () => {
            wrapper = mountDrawer({
                request: createRequest({
                    status: 'open',
                    deliverer: null,
                }),
            });

            await wrapper.find('.unexpanded-accept-btn').trigger('click');

            expect(wrapper.emitted('accept')).toHaveLength(1);
            expect(wrapper.emitted('accept')[0]).toEqual([100]);
        });

        it('does not show runner information before accepting an order', () => {
            wrapper = mountDrawer({
                request: createRequest({
                    status: 'open',
                    deliverer: null,
                }),
            });

            expect(wrapper.text()).not.toContain('Runner');
            expect(wrapper.find('.complete-btn').exists()).toBe(false);
            expect(wrapper.find('.chat-btn').exists()).toBe(false);
        });
    });

    describe('after accepting an order', () => {
        it('shows runner information after accepting an order', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
            });

            expect(wrapper.text()).toContain('Runner');
            expect(wrapper.text()).toContain('testRunner');
        });

        it('shows chat button after accepting an order', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
            });

            expect(wrapper.find('.chat-btn').exists()).toBe(true);
            expect(wrapper.find('.chat-btn').text()).toContain('Chat');
        });

        it('emits chat when the chat button is clicked', async () => {
            const request = createAcceptedRequest();

            wrapper = mountDrawer({ request });

            await wrapper.find('.chat-btn').trigger('click');

            expect(wrapper.emitted('chat')).toHaveLength(1);
            expect(wrapper.emitted('chat')[0]).toEqual([request]);
        });

        it('shows runner online status to the buyer', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: buyer,
                props: {
                    runnerOnline: true,
                },
            });

            expect(wrapper.find('.online-dot').exists()).toBe(true);
            expect(wrapper.find('.online-dot').classes()).not.toContain('offline');
        });

        it('shows runner offline status to the buyer', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: buyer,
                props: {
                    runnerOnline: false,
                },
            });

            expect(wrapper.find('.online-dot').exists()).toBe(true);
            expect(wrapper.find('.online-dot').classes()).toContain('offline');
        });

        it('does not show online dot to the runner viewing their own accepted order', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: runner,
                props: {
                    runnerOnline: true,
                },
            });

            expect(wrapper.find('.online-dot').exists()).toBe(false);
        });
    });

    describe('delivery action buttons', () => {
        it('shows PICKED UP ORDER and CANCEL buttons to the runner', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: runner,
            });

            expect(wrapper.find('.complete-btn').exists()).toBe(true);
            expect(wrapper.find('.complete-btn').text()).toBe('PICKED UP ORDER');

            expect(wrapper.find('.cancel-btn').exists()).toBe(true);
            expect(wrapper.find('.cancel-btn').text()).toContain('CANCEL');
        });

        it('emits collected when the runner clicks PICKED UP ORDER', async () => {
            const request = createAcceptedRequest();

            wrapper = mountDrawer({
                request,
                user: runner,
            });

            await wrapper.find('.complete-btn').trigger('click');

            expect(wrapper.emitted('collected')).toHaveLength(1);
            expect(wrapper.emitted('collected')[0]).toEqual([request]);
        });

        it('shows COMPLETE ORDER and CANCEL buttons to the buyer', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: buyer,
            });

            expect(wrapper.find('.complete-btn').exists()).toBe(true);
            expect(wrapper.find('.complete-btn').text()).toBe('COMPLETE ORDER');

            expect(wrapper.find('.cancel-btn').exists()).toBe(true);
            expect(wrapper.find('.cancel-btn').text()).toContain('CANCEL');
        });

        it('emits complete when the buyer clicks COMPLETE ORDER', async () => {
            const request = createAcceptedRequest();

            wrapper = mountDrawer({
                request,
                user: buyer,
            });

            await wrapper.find('.complete-btn').trigger('click');

            expect(wrapper.emitted('complete')).toHaveLength(1);
            expect(wrapper.emitted('complete')[0]).toEqual([request]);
        });

        it('disables runner pickup button when the order has already been picked up', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest({
                    collectedAt: '2026-06-08T15:30:00.000Z',
                }),
                user: runner,
            });

            expect(wrapper.find('.complete-btn').attributes('disabled')).toBeDefined();
            expect(wrapper.find('.complete-btn').text()).toBe('ORDER PICKED UP');
        });

        it('hides cancellation from the buyer after the order has been picked up', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest({
                    collectedAt: '2026-06-08T15:30:00.000Z',
                }),
                user: buyer,
            });

            expect(wrapper.find('.cancel-btn').exists()).toBe(false);
        });

        it('keeps cancellation available to the runner after the order has been picked up', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest({
                    collectedAt: '2026-06-08T15:30:00.000Z',
                }),
                user: runner,
            });

            expect(wrapper.find('.cancel-btn').exists()).toBe(true);
        });
    });

    describe('pickup time', () => {
        it('does not show pickup time when collectedAt does not exist', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest({
                    collectedAt: null,
                }),
            });

            expect(wrapper.text()).not.toContain('Picked Up');
        });

        it('shows pickup time when collectedAt exists', () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest({
                    collectedAt: '2026-06-08T15:30:00.000Z',
                }),
            });

            expect(wrapper.text()).toContain('Picked Up');
        });
    });

    describe('cancel panel', () => {
        it('opens CancelPanel when the CANCEL button is clicked for an accepted order', async () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
                user: buyer,
            });

            expect(wrapper.findComponent(CancelPanel).exists()).toBe(false);

            await wrapper.find('.cancel-btn').trigger('click');

            expect(wrapper.findComponent(CancelPanel).exists()).toBe(true);
            expect(wrapper.find('.cancel-panel').exists()).toBe(true);
        });

        it('emits cancel immediately for an OPEN buyer order as no reason is required', async () => {
            const request = createRequest({
                status: 'open',
                deliverer: null,
            });

            wrapper = mountDrawer({
                request,
                user: buyer,
                props: {
                    active: true,
                },
            });

            expect(wrapper.find('.cancel-btn').exists()).toBe(true);

            await wrapper.find('.cancel-btn').trigger('click');

            expect(wrapper.emitted('cancel')).toHaveLength(1);
            expect(wrapper.emitted('cancel')[0]).toEqual([
                {
                    request,
                    reason: null,
                    error: undefined,
                },
            ]);
        });

        it('emits cancel with reason from CancelPanel', async () => {
            const request = createAcceptedRequest();

            wrapper = mountDrawer({
                request,
                user: buyer,
            });

            await wrapper.find('.cancel-btn').trigger('click');

            wrapper.findComponent(CancelPanel).vm.$emit('cancel', {
                reason: 'Runner is taking too long',
            });

            expect(wrapper.emitted('cancel')).toHaveLength(1);
            expect(wrapper.emitted('cancel')[0]).toEqual([
                {
                    request,
                    reason: 'Runner is taking too long',
                    error: undefined,
                },
            ]);
        });
    });

    describe('copy buttons', () => {
        it('copies the order ID when the order ID copy button is clicked', async () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
            });

            const copyButtons = wrapper.findAll('.copy-value');

            await copyButtons[0].trigger('click');

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('00000100');
        });

        it('copies the buyer name when the buyer copy button is clicked', async () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
            });

            const copyButtons = wrapper.findAll('.copy-value');

            await copyButtons[1].trigger('click');

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testBuyer');
        });

        it('copies the runner name when the runner copy button is clicked', async () => {
            wrapper = mountDrawer({
                request: createAcceptedRequest(),
            });

            const copyButtons = wrapper.findAll('.copy-value');

            await copyButtons[2].trigger('click');

            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('testRunner');
        });
    });
});
