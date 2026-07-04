import { setActivePinia, createPinia } from 'pinia';

jest.mock('../../../src/utils/socket', () => ({
  getSocket: () => ({ on: jest.fn(), off: jest.fn() }),
}));

jest.mock('../../../src/utils/api', () => ({
  apiRequest: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('../../../src/utils/push', () => ({
  pushSupported: () => false,
  notificationPermission: () => 'default',
  enablePush: jest.fn(),
  disablePush: jest.fn(),
  hasPushSubscription: jest.fn().mockResolvedValue(false),
}));

import { apiRequest as mockApi } from '../../../src/utils/api';
import { useNotificationsStore } from '../../../src/stores/notifications.js';

describe('useNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.post.mockResolvedValue({});
  });

  it('load() fills items and the unread count from the API', async () => {
    mockApi.get.mockResolvedValueOnce({
      notifications: [
        { id: 2, type: 'request_accepted', title: 'Order accepted', read: false, createdAt: 'now' },
        { id: 1, type: 'system', title: 'Welcome', read: true, createdAt: 'then' },
      ],
      hasMore: false,
      unreadCount: 1,
    });

    const store = useNotificationsStore();
    await store.load();

    expect(store.items).toHaveLength(2);
    expect(store.unreadCount).toBe(1);
    expect(store.loaded).toBe(true);
  });

  it('markAllRead() optimistically clears unread and tells the server', async () => {
    mockApi.get.mockResolvedValueOnce({
      notifications: [{ id: 1, type: 'system', title: 'Hi', read: false, createdAt: 'now' }],
      hasMore: false,
      unreadCount: 1,
    });

    const store = useNotificationsStore();
    await store.load();
    await store.markAllRead();

    expect(store.unreadCount).toBe(0);
    expect(store.items.every((n) => n.read)).toBe(true);
    expect(mockApi.post).toHaveBeenCalledWith('/notifications/read', { all: true });
  });

  it('markRead() clears only the given ids and decrements the count', async () => {
    mockApi.get.mockResolvedValueOnce({
      notifications: [
        { id: 2, type: 'request_accepted', title: 'A', read: false, createdAt: 'now' },
        { id: 1, type: 'request_collected', title: 'B', read: false, createdAt: 'then' },
      ],
      hasMore: false,
      unreadCount: 2,
    });

    const store = useNotificationsStore();
    await store.load();
    await store.markRead([2]);

    expect(store.unreadCount).toBe(1);
    expect(store.items.find((n) => n.id === 2).read).toBe(true);
    expect(store.items.find((n) => n.id === 1).read).toBe(false);
    expect(mockApi.post).toHaveBeenCalledWith('/notifications/read', { ids: [2] });
  });
});
