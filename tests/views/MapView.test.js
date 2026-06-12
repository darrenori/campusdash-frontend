import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';

const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
};

jest.mock('../../src/utils/socket', () => ({
    getSocket: () => mockSocket,
}));

const mockMap = {
    panTo: jest.fn(),
    setZoom: jest.fn(),
};

const mockSetMap = jest.fn();

const mockComputeRoutes = jest.fn().mockResolvedValue({
    routes: [
        {
            createPolylines: jest.fn(() => [
                {
                    setMap: mockSetMap,
                },
            ]),
        },
    ],
});

jest.mock('vue3-google-map', () => {
    const { defineComponent, h } = require('vue');

    return {
        GoogleMap: defineComponent({
            name: 'GoogleMap',
            props: [
                'apiKey',
                'mapId',
                'center',
                'zoom',
                'disableDefaultUi',
                'clickableIcons',
                'keyboardShortcuts',
                'colorScheme',
            ],
            emits: ['click'],
            setup(props, { slots, emit, expose }) {
                expose({
                    map: mockMap,
                });
                // https://vuejs.org/guide/extras/render-function
                return () =>
                    h(
                        'div',
                        {
                            class: 'google-map-stub',
                            onClick: () => emit('click'),
                        },
                        slots.default?.()
                    );
            },
        }),

        AdvancedMarker: defineComponent({
            name: 'AdvancedMarker',
            props: ['options', 'pinOptions'],
            emits: ['click'],
            setup(props, { slots, emit }) {
                return () =>
                    h(
                        'button',
                        {
                            class: 'advanced-marker-stub',
                            'data-title': props.options?.title || '',
                            onClick: () => emit('click'),
                        },
                        slots.default?.() || props.options?.title || ''
                    );
            },
        }),
    };
});

import MapView from '../../src/views/MapView.vue';

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

const openRequests = [
    {
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
            lat: 1.304000,
            lng: 103.773800,
        },
        deliveryCoords: {
            lat: 1.297473646481507,
            lng: 103.7812157830612,
        },
        collectedAt: null,
        deliveredAt: null,
        createdAt: '1970-01-01T00:00:00.000Z',
    },
    {
        id: 101,
        deliveryLocation: 'COM1',
        deliveryLocationId: 6,
        canteen: 'Techno Edge',
        canteenId: 4,
        stall: 'Western',
        stallId: 30,
        item: 'Pasta',
        specialRequest: '',
        deliveryInfo: 'Outside lobby',
        status: 'open',
        requester: {
            id: 3,
            name: 'otherBuyer',
            pfpUrl: null,
        },
        deliverer: null,
        pickupCoords: {
            lat: 1.297,
            lng: 103.773,
        },
        deliveryCoords: {
            lat: 1.294,
            lng: 103.772,
        },
        collectedAt: null,
        deliveredAt: null,
        createdAt: '1970-01-01T00:00:00.000Z',
    },
];

function createAcceptedRequest(overrides = {}) {
    return {
        ...openRequests[0],
        status: 'accepted',
        deliverer: runner,
        ...overrides,
    };
}

function mountMap({
    requests = openRequests,
    myRequest = null,
    currentUserId = buyer.id,
    props = {},
} = {}) {
    const pinia = createPinia();
    setActivePinia(pinia);

    return mount(MapView, {
        props: {
            requests,
            myRequest,
            acceptingId: null,
            onlineUserIds: new Set(),
            currentUserId,
            ...props,
        },
        global: {
            plugins: [pinia],
        },
    });
}

describe('MapView.vue', () => {
    let wrapper;
    let geolocationSuccess;

    beforeEach(() => {
        jest.clearAllMocks();

        geolocationSuccess = null;

        Object.defineProperty(navigator, 'geolocation', {
            value: {
                watchPosition: jest.fn((success) => {
                    geolocationSuccess = success;
                    return 123;
                }),
                clearWatch: jest.fn(),
            },
            configurable: true,
        });

        window.google = {
            maps: {
                importLibrary: jest.fn().mockResolvedValue({
                    Route: {
                        computeRoutes: mockComputeRoutes,
                    },
                }),
            },
        };
    });

    afterEach(() => {
        wrapper?.unmount();
        delete window.google;
    });

    describe('open order markers', () => {
        it('displays pins for all open orders when there is no active request', () => {
            wrapper = mountMap();

            const markers = wrapper.findAll('.advanced-marker-stub');

            expect(markers).toHaveLength(2);
            expect(markers[0].attributes('data-title')).toBe('LT28');
            expect(markers[1].attributes('data-title')).toBe('COM1');
        });

        it('emits select-request when an open order marker is clicked', async () => {
            wrapper = mountMap();

            await wrapper.findAll('.advanced-marker-stub')[0].trigger('click');

            expect(wrapper.emitted('select-request')).toHaveLength(1);
            expect(wrapper.emitted('select-request')[0]).toEqual([openRequests[0]]);
        });

        it('emits map-click when the map is clicked', async () => {
            wrapper = mountMap();

            await wrapper.find('.google-map-stub').trigger('click');

            expect(wrapper.emitted('map-click')).toHaveLength(1);
        });
    });

    describe('accepted order markers', () => {
        it('replaces open order pins with pickup and delivery pins when myRequest exists', () => {
            wrapper = mountMap({
                myRequest: createAcceptedRequest(),
                currentUserId: buyer.id,
            });

            const markers = wrapper.findAll('.advanced-marker-stub');

            expect(markers).toHaveLength(2);
            expect(markers[0].attributes('data-title')).toBe("Pickup: Chef's Wok");
            expect(markers[1].attributes('data-title')).toBe('Delivery: LT28');
        });
    });

    describe('runner location and route', () => {
        it('joins the request room and starts watching location for the runner', () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('request:join', {
                requestId: 100,
            });

            expect(navigator.geolocation.watchPosition).toHaveBeenCalled();
        });

        it('emits runner location and routes to pickup before the order is picked up', async () => {
            const request = createAcceptedRequest({
                collectedAt: null,
            });

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: 1.298900,
                    longitude: 103.774100,
                },
            });

            await flushPromises();

            expect(mockSocket.emit).toHaveBeenCalledWith('delivery:location', {
                requestId: 100,
                latitude: 1.298900,
                longitude: 103.774100,
            });

            expect(mockComputeRoutes).toHaveBeenCalledWith({
                origin: {
                    lat: 1.298900,
                    lng: 103.774100,
                },
                destination: request.pickupCoords,
                travelMode: 'WALKING',
                fields: ['path'],
            });

            expect(mockSetMap).toHaveBeenCalledWith(mockMap);
        });

        it('updates the route destination to delivery location after the order is picked up', async () => {
            const request = createAcceptedRequest({
                collectedAt: null,
            });

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: 1.298900,
                    longitude: 103.774100,
                },
            });

            await flushPromises();

            await wrapper.setProps({
                myRequest: {
                    ...request,
                    collectedAt: '1970-01-01T00:00:00.000Z',
                },
            });

            await flushPromises();

            geolocationSuccess({
                coords: {
                    latitude: 1.298900,
                    longitude: 103.774100,
                },
            });

            await flushPromises();

            expect(mockComputeRoutes).toHaveBeenLastCalledWith({
                origin: {
                    lat: 1.298900,
                    lng: 103.774100,
                },
                destination: request.deliveryCoords,
                travelMode: 'WALKING',
                fields: ['path'],
            });
        });

        it('clears route and stops geolocation when active request is removed', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: 1.298900,
                    longitude: 103.774100,
                },
            });

            await flushPromises();

            await wrapper.setProps({
                myRequest: null,
            });

            await nextTick();

            expect(mockSetMap).toHaveBeenCalledWith(null);
            expect(navigator.geolocation.clearWatch).toHaveBeenCalledWith(123);
        });
    });

    describe('buyer receiving runner location', () => {
        it('buyer listens for runner location updates', () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('request:join', {
                requestId: 100,
            });

            expect(mockSocket.on).toHaveBeenCalledWith(
                'delivery:location',
                expect.any(Function)
            );

            expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
        });

        it('displays runner location received from socket', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                latitude: 1.304000,
                longitude: 103.773800,
            });

            await nextTick();

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).toContain("Runner's Location");
        });

        it('ignores runner location events for other requests', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 999,
                latitude: 1.304000,
                longitude: 103.773800,
            });

            await nextTick();

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).not.toContain("Runner's Location");
        });

        it('removes socket listener on unmount', () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            wrapper.unmount();

            expect(mockSocket.off).toHaveBeenCalledWith(
                'delivery:location',
                expect.any(Function)
            );
        });
    });

    describe('returning to open order state', () => {
        it('shows open order pins again when myRequest is cleared', async () => {
            wrapper = mountMap({
                myRequest: createAcceptedRequest(),
                currentUserId: buyer.id,
            });

            await wrapper.setProps({
                myRequest: null,
            });

            await nextTick();

            const markers = wrapper.findAll('.advanced-marker-stub');

            expect(markers).toHaveLength(2);
            expect(markers[0].attributes('data-title')).toBe('LT28');
            expect(markers[1].attributes('data-title')).toBe('COM1');
        });
    });
});