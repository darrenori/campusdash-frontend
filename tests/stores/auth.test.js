import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth.js';
import { apiRequest } from '../../src/utils/api.js';
import router from '../../src/router/index.js';

jest.mock('../../src/utils/api.js');

jest.mock('../../src/router/index.js', () => ({
    __esModule: true,
    default: { push: jest.fn() },
}));

describe('useAuthStore', () => {
    // Deep copy this if altering fields (e.g. points):
    // const localCopy = JSON.parse(JSON.stringify(mockUser));
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
        localStorage.clear();
        setActivePinia(createPinia());
        jest.clearAllMocks();
    });

    describe('initial state', () => {
        it('starts unauthenticated with user as null if localStorage is empty', () => {
            const store = useAuthStore();
            expect(store.isAuthenticated).toBe(false);
            expect(store.user).toBeNull();
        });

        it('inherits userData if the property exists in localStorage', () => {
            localStorage.setItem('userData', JSON.stringify(mockUser));

            const store = useAuthStore();
            expect(store.isAuthenticated).toBe(true);
            expect(store.user).toEqual(mockUser);
        });
    });

    describe('setLoggedIn', () => {
        it('updates user state and syncs to localStorage', () => {
            const store = useAuthStore();

            store.setLoggedIn(mockUser);

            expect(store.isAuthenticated).toBe(true);
            expect(store.user).toEqual(mockUser);
            expect(JSON.parse(localStorage.getItem('userData'))).toEqual(mockUser);
        });
    });

    describe('logout', () => {
        it('clears state, clears localStorage, and routes to login on success', async () => {
            apiRequest.post.mockResolvedValueOnce({});
            localStorage.setItem('userData', JSON.stringify(mockUser));

            const store = useAuthStore();
            await store.logout();

            expect(apiRequest.post).toHaveBeenCalledWith('/auth/logout');
            expect(store.isAuthenticated).toBe(false);
            expect(store.user).toBeNull();
            expect(localStorage.getItem('userData')).toBeNull();
            expect(router.push).toHaveBeenCalledWith('/login');
        });

        it('still cleans up completely even if the logout API endpoint throws an error', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            apiRequest.post.mockRejectedValueOnce(new Error('Network error'));
            localStorage.setItem('userData', JSON.stringify(mockUser));

            const store = useAuthStore();
            await store.logout();

            expect(store.isAuthenticated).toBe(false);
            expect(store.user).toBeNull();
            expect(localStorage.getItem('userData')).toBeNull();
            expect(router.push).toHaveBeenCalledWith('/login');

            consoleSpy.mockRestore();
        });
    });

    describe('adjustPoints', () => {
        it('adds delta to points and saves to storage', () => {
            const localCopy = JSON.parse(JSON.stringify(mockUser));
            localStorage.setItem('userData', JSON.stringify(localCopy));
            const store = useAuthStore();

            store.adjustPoints(5);

            expect(store.user.points).toBe(105);
            expect(JSON.parse(localStorage.getItem('userData')).points).toBe(105);
        });

        it('defaults undefined points to 0 before adjusting', () => {
            const mockPointlessUser = JSON.parse(JSON.stringify(mockUser));
            delete mockPointlessUser.points;

            localStorage.setItem('userData', JSON.stringify(mockPointlessUser));
            const store = useAuthStore();

            store.adjustPoints(10);

            expect(store.user.points).toBe(10);
        });

        it('does nothing if user is not logged in', () => {
            const store = useAuthStore();
            expect(() => store.adjustPoints(10)).not.toThrow();
        });
    });

    describe('setPoints', () => {
        it('overwrites points with explicit value', () => {
            const localCopy = JSON.parse(JSON.stringify(mockUser));
            localStorage.setItem('userData', JSON.stringify(localCopy));
            const store = useAuthStore();

            store.setPoints(45);

            expect(store.user.points).toBe(45);
            expect(JSON.parse(localStorage.getItem('userData')).points).toBe(45);
        });

        it('parses strings cleanly into numbers', () => {
            const localCopy = JSON.parse(JSON.stringify(mockUser));
            localStorage.setItem('userData', JSON.stringify(localCopy));
            const store = useAuthStore();

            store.setPoints('25');

            expect(store.user.points).toBe(25);
        });

        it('rejects invalid point values like NaN or non-finite inputs', () => {
            const localCopy = JSON.parse(JSON.stringify(mockUser));
            localStorage.setItem('userData', JSON.stringify(localCopy));
            const store = useAuthStore();

            store.setPoints('not-a-number');

            expect(store.user.points).toBe(100);
        });
    });
});