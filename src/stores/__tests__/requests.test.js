import { setActivePinia, createPinia } from 'pinia';
import { useRequestStore } from '../requests.js';

describe('useRequestStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with no active request', () => {
    const store = useRequestStore();
    expect(store.activeRequest).toBeNull();
  });

  describe('setActiveRequest', () => {
    it('stores the given request object', () => {
      const store = useRequestStore();
      const req = { id: 'req-1', item: 'Chicken Rice', canteen: 'YIH' };
      store.setActiveRequest(req);
      expect(store.activeRequest).toEqual(req);
    });

    it('replaces any previously stored request', () => {
      const store = useRequestStore();
      store.setActiveRequest({ id: 'req-1' });
      store.setActiveRequest({ id: 'req-2' });
      expect(store.activeRequest.id).toBe('req-2');
    });
  });

  describe('clearActiveRequest', () => {
    it('sets activeRequest back to null', () => {
      const store = useRequestStore();
      store.setActiveRequest({ id: 'req-1' });
      store.clearActiveRequest();
      expect(store.activeRequest).toBeNull();
    });

    it('is safe to call when already null', () => {
      const store = useRequestStore();
      expect(() => store.clearActiveRequest()).not.toThrow();
      expect(store.activeRequest).toBeNull();
    });
  });
});
