import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

const mockSocket = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
};

jest.mock('../../../src/utils/socket', () => ({
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
                        slots.content?.() || slots.default?.() || props.options?.title || ''
                    );
            },
        }),
    };
});

import MapView from '../../../src/views/MapView.vue';

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

const coordinates = {
    LT28: {
        lat: 1.297473646481507,
        lng: 103.78121578306128,
    },
    YIH: {
        lat: 1.298472440900191,
        lng: 103.77507528896697,
    },
    TheDeck: {
        lat: 1.294440026545261,
        lng: 103.77256564663666,
    },
    Frontier: {
        lat: 1.2964433479553557,
        lng: 103.7803618830965,
    },
    TechnoEdge: {
        lat: 1.2978825969642034,
        lng: 103.77165288588382,
    },
    TheTerrace: {
        lat: 1.2943981887817795,
        lng: 103.7743379949419,
    },
    PGPCanteen: {
        lat: 1.2906843782448865,
        lng: 103.78217099994684,
    },
    FineFood: {
        lat: 1.3040520791814607,
        lng: 103.77353791197781,
    },
    FlavoursAtUTown: {
        lat: 1.3044218319272263,
        lng: 103.77298913810716,
    },
};

const runnerLiveLocation = {
    latitude: coordinates.YIH.lat,
    longitude: coordinates.YIH.lng,
};

const buyerLiveLocation = {
    latitude: coordinates.LT28.lat,
    longitude: coordinates.LT28.lng,
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
            lat: coordinates.Frontier.lat,
            lng: coordinates.Frontier.lng,
        },
        deliveryCoords: {
            lat: coordinates.LT28.lat,
            lng: coordinates.LT28.lng,
        },
        collectedAt: null,
        deliveredAt: null,
        createdAt: '1970-01-01T00:00:00.000Z',
    },
    {
        id: 101,
        deliveryLocation: 'The Deck',
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
            lat: coordinates.TechnoEdge.lat,
            lng: coordinates.TechnoEdge.lng,
        },
        deliveryCoords: {
            lat: coordinates.TheDeck.lat,
            lng: coordinates.TheDeck.lng,
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
            currentUserId,
            filterOptions: [
                { key: 'all', label: 'All', badge: requests.length || null },
                { key: 'next-class', label: 'Next Class', badge: null },
            ],
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
            expect(markers[0].attributes('data-title')).toBe('Frontier to LT28');
            expect(markers[1].attributes('data-title')).toBe('Techno Edge to The Deck');
        });

        it('emits select-request when an open order marker is clicked', async () => {
            wrapper = mountMap();

            await wrapper.findAll('.advanced-marker-stub')[0].trigger('click');

            expect(wrapper.emitted('select-request')).toHaveLength(1);
            expect(wrapper.emitted('select-request')[0]).toEqual([openRequests[0]]);
        });

        it('groups open orders with the same destination under one pin', () => {
            wrapper = mountMap({
                requests: [
                    openRequests[0],
                    {
                        ...openRequests[0],
                        id: 102,
                        stall: 'Thai',
                        item: 'Iced kopi',
                    },
                    openRequests[1],
                ],
            });

            const markers = wrapper.findAll('.advanced-marker-stub');

            expect(markers).toHaveLength(2);
            expect(markers[0].attributes('data-title')).toBe('2 orders to LT28');
            expect(markers[1].attributes('data-title')).toBe('Techno Edge to The Deck');
        });

    });

    describe('accepted order markers', () => {
        it('replaces open order pins with pickup and delivery pins when myRequest exists', () => {
            wrapper = mountMap({
                myRequest: createAcceptedRequest(),
                currentUserId: buyer.id,
            });

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).toContain("Pickup: Chef's Wok");
            expect(markerTitles).toContain('Delivery: LT28');
            expect(markerTitles).not.toContain('The Deck');
        });
    });

    describe('runner location and route', () => {
        it('joins the request room, tracks own location, and listens for participant locations as runner', () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('request:join', {
                requestId: 100,
            });

            expect(navigator.geolocation.watchPosition).toHaveBeenCalled();

            expect(mockSocket.on).toHaveBeenCalledWith(
                'delivery:location',
                expect.any(Function)
            );
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
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
                },
            });

            await flushPromises();

            expect(mockSocket.emit).toHaveBeenCalledWith('delivery:location', {
                requestId: 100,
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            expect(mockComputeRoutes).toHaveBeenCalledWith({
                origin: {
                    lat: runnerLiveLocation.latitude,
                    lng: runnerLiveLocation.longitude,
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
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
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
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
                },
            });

            await flushPromises();

            expect(mockComputeRoutes).toHaveBeenLastCalledWith({
                origin: {
                    lat: runnerLiveLocation.latitude,
                    lng: runnerLiveLocation.longitude,
                },
                destination: request.deliveryCoords,
                travelMode: 'WALKING',
                fields: ['path'],
            });
        });

        it('displays buyer location received from socket in runner view', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: buyer.id,
                role: 'buyer',
                latitude: buyerLiveLocation.latitude,
                longitude: buyerLiveLocation.longitude,
            });

            await nextTick();

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).toContain("Buyer's Location");
        });

        it('clears route and stops geolocation when active request is removed', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
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

    describe('buyer location without route', () => {
        it('joins the request room, tracks own location, and listens for participant locations as buyer', () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('request:join', {
                requestId: 100,
            });

            expect(navigator.geolocation.watchPosition).toHaveBeenCalled();

            expect(mockSocket.on).toHaveBeenCalledWith(
                'delivery:location',
                expect.any(Function)
            );
        });

        it('emits buyer location but does not calculate route', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: buyerLiveLocation.latitude,
                    longitude: buyerLiveLocation.longitude,
                },
            });

            await flushPromises();

            expect(mockSocket.emit).toHaveBeenCalledWith('delivery:location', {
                requestId: 100,
                userId: buyer.id,
                role: 'buyer',
                latitude: buyerLiveLocation.latitude,
                longitude: buyerLiveLocation.longitude,
            });

            expect(mockComputeRoutes).not.toHaveBeenCalled();
        });

        it('displays runner location received from socket in buyer view', async () => {
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
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            await nextTick();

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).toContain("Runner's Location");
        });

        it('ignores participant location events for other requests', async () => {
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
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            await nextTick();

            const markerTitles = wrapper
                .findAll('.advanced-marker-stub')
                .map((marker) => marker.attributes('data-title'));

            expect(markerTitles).not.toContain("Runner's Location");
        });
    });

    describe('location marker colours', () => {
        it('uses blue for own Runner location and orange for Buyer location in Runner view', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
                },
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: buyer.id,
                role: 'buyer',
                latitude: buyerLiveLocation.latitude,
                longitude: buyerLiveLocation.longitude,
            });

            await flushPromises();

            const runnerMarker = wrapper
                .findAll('.advanced-marker-stub')
                .find((marker) => marker.attributes('data-title') === "Runner's Location");

            const buyerMarker = wrapper
                .findAll('.advanced-marker-stub')
                .find((marker) => marker.attributes('data-title') === "Buyer's Location");

            expect(runnerMarker.find('.own-location').exists()).toBe(true);
            expect(buyerMarker.find('.other-location').exists()).toBe(true);
        });

        it('uses blue for own Buyer location and orange for Runner location in Buyer view', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: buyerLiveLocation.latitude,
                    longitude: buyerLiveLocation.longitude,
                },
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            await flushPromises();

            const buyerMarker = wrapper
                .findAll('.advanced-marker-stub')
                .find((marker) => marker.attributes('data-title') === "Buyer's Location");

            const runnerMarker = wrapper
                .findAll('.advanced-marker-stub')
                .find((marker) => marker.attributes('data-title') === "Runner's Location");

            expect(buyerMarker.find('.own-location').exists()).toBe(true);
            expect(runnerMarker.find('.other-location').exists()).toBe(true);
        });
    });

    describe('center location controls', () => {
        it('shows Buyer and You buttons for Runner view with correct classes', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: runnerLiveLocation.latitude,
                    longitude: runnerLiveLocation.longitude,
                },
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: buyer.id,
                role: 'buyer',
                latitude: buyerLiveLocation.latitude,
                longitude: buyerLiveLocation.longitude,
            });

            await flushPromises();

            const buttons = wrapper.findAll('.center-location-btn');

            expect(buttons).toHaveLength(2);

            expect(buttons[0].text()).toBe('Buyer');
            expect(buttons[0].classes()).toContain('other-location');

            expect(buttons[1].text()).toBe('You');
            expect(buttons[1].classes()).toContain('own-location');
        });

        it('shows You and Runner buttons for Buyer view with correct classes', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: buyer.id,
            });

            geolocationSuccess({
                coords: {
                    latitude: buyerLiveLocation.latitude,
                    longitude: buyerLiveLocation.longitude,
                },
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            await flushPromises();

            const buttons = wrapper.findAll('.center-location-btn');

            expect(buttons).toHaveLength(2);

            expect(buttons[0].text()).toBe('You');
            expect(buttons[0].classes()).toContain('own-location');

            expect(buttons[1].text()).toBe('Runner');
            expect(buttons[1].classes()).toContain('other-location');
        });

        it('centers on buyer location when buyer center button is clicked', async () => {
            const request = createAcceptedRequest();

            wrapper = mountMap({
                myRequest: request,
                currentUserId: runner.id,
            });

            const locationHandler = mockSocket.on.mock.calls.find(
                ([eventName]) => eventName === 'delivery:location'
            )[1];

            locationHandler({
                requestId: 100,
                userId: buyer.id,
                role: 'buyer',
                latitude: buyerLiveLocation.latitude,
                longitude: buyerLiveLocation.longitude,
            });

            await nextTick();

            await wrapper.findAll('.center-location-btn')[0].trigger('click');

            expect(mockMap.panTo).toHaveBeenCalledWith({
                lat: buyerLiveLocation.latitude,
                lng: buyerLiveLocation.longitude,
            });
            expect(mockMap.setZoom).toHaveBeenCalledWith(17);
        });

        it('centers on runner location when runner center button is clicked', async () => {
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
                userId: runner.id,
                role: 'runner',
                latitude: runnerLiveLocation.latitude,
                longitude: runnerLiveLocation.longitude,
            });

            await nextTick();

            await wrapper.findAll('.center-location-btn')[1].trigger('click');

            expect(mockMap.panTo).toHaveBeenCalledWith({
                lat: runnerLiveLocation.latitude,
                lng: runnerLiveLocation.longitude,
            });
            expect(mockMap.setZoom).toHaveBeenCalledWith(17);
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
            expect(markers[0].attributes('data-title')).toBe('Frontier to LT28');
            expect(markers[1].attributes('data-title')).toBe('Techno Edge to The Deck');
        });
    });
});