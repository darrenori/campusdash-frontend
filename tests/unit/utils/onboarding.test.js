import {
    completeOnboarding,
    shouldStartOnboarding,
} from '../../../src/utils/onboarding.js';

describe('onboarding storage', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.restoreAllMocks();
    });

    it('starts when the user has no completion flag', () => {
        expect(shouldStartOnboarding()).toBe(true);
    });

    it('does not restart after completion', () => {
        completeOnboarding();

        expect(shouldStartOnboarding()).toBe(false);
        expect(localStorage.getItem('onboarding')).toBe('1');
    });

    it('fails closed when browser storage is unavailable', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('Storage unavailable');
        });

        expect(shouldStartOnboarding()).toBe(false);
    });
});
