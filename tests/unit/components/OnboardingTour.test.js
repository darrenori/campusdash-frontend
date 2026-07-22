import { mount } from '@vue/test-utils';
import OnboardingTour from '../../../src/components/OnboardingTour.vue';

const mockCurrentRoute = { value: { path: '/' } };
const mockPush = jest.fn(async (path) => {
    mockCurrentRoute.value.path = path;
});

jest.mock('vue-router', () => ({
    useRouter: () => ({ currentRoute: mockCurrentRoute, push: mockPush }),
}));

const wait = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

describe('OnboardingTour.vue', () => {
    let wrapper;
    let targetTop;

    beforeEach(() => {
        localStorage.clear();
        mockCurrentRoute.value.path = '/';
        mockPush.mockClear();
        targetTop = 100;

        window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
        window.cancelAnimationFrame = (id) => clearTimeout(id);
        window.ResizeObserver = class {
            observe() { }
            disconnect() { }
        };
        Element.prototype.scrollIntoView = jest.fn();

        const anchors = [
            'view-toggle',
            'request',
            'request-location',
            'request-details',
            'request-submit',
            'paynow-upload',
            'notifications',
            'timetable-card',
            'timetable-input',
        ];

        anchors.forEach((name) => {
            const anchor = document.createElement('div');
            anchor.dataset.tour = name;
            anchor.getBoundingClientRect = () => ({
                top: targetTop,
                left: 40,
                width: 180,
                height: 44,
                right: 220,
                bottom: targetTop + 44,
            });
            document.body.appendChild(anchor);
        });
    });

    afterEach(() => {
        wrapper?.unmount();
        document.body.innerHTML = '';
    });

    it('keeps the spotlight aligned when the page scrolls', async () => {
        wrapper = mount(OnboardingTour, {
            props: { userId: 42 },
            attachTo: document.body,
        });

        await wait(275);
        document.querySelector('.tour-actions-center .tour-btn-primary').click();
        await wait(20);

        expect(document.querySelector('.spot-ring').getAttribute('y')).toBe('92');

        targetTop = 260;
        window.dispatchEvent(new Event('scroll'));
        await wait(20);

        expect(document.querySelector('.spot-ring').getAttribute('y')).toBe('252');
    });

    it('finishes with one clear action', async () => {
        wrapper = mount(OnboardingTour, {
            props: { userId: 42 },
            attachTo: document.body,
        });

        await wait(275);

        for (let step = 0; step < 10; step++) {
            document.querySelector('.tour-btn-primary').click();
            await wait(10);
        }

        expect(document.querySelector('.tour-btn-primary').textContent).toBe("Let's go!");
        expect(document.querySelector('.tour-btn-text')).toBeNull();
    });
});
