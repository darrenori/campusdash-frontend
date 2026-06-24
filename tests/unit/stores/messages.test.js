import { setActivePinia, createPinia } from 'pinia';

jest.mock('../../../src/utils/socket', () => {
  const handlers = {};
  const ioHandlers = {};
  const socket = {
    connected: true,
    emit: jest.fn(),
    on: jest.fn((e, fn) => { handlers[e] = fn; }),
    off: jest.fn(),
    io: {
      on: jest.fn((e, fn) => { ioHandlers[e] = fn; }),
      off: jest.fn(),
    },
    __handlers: handlers,
  };
  return { getSocket: () => socket, disconnectSocket: jest.fn() };
});

jest.mock('../../../src/utils/api', () => ({
  apiRequest: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), postFormData: jest.fn(), delete: jest.fn() },
}));

jest.mock('../../../src/router/index.js', () => ({
  __esModule: true,
  default: { push: jest.fn() },
}));

import { apiRequest } from '../../../src/utils/api';
import { getSocket } from '../../../src/utils/socket';
import { useMessagesStore } from '../../../src/stores/messages.js';
import { useAuthStore } from '../../../src/stores/auth.js';

const fakeSocket = getSocket();
const handlers = fakeSocket.__handlers;
const emit = (event, payload) => handlers[event] && handlers[event](payload);

const sampleConversation = (overrides = {}) => ({
  id: 1,
  requestId: null,
  unreadCount: 0,
  lastMessageAt: null,
  otherUser: { id: 2, name: 'Bob', pfpUrl: null, online: false },
  lastMessage: null,
  ...overrides,
});

describe('useMessagesStore', () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((k) => delete handlers[k]);
    setActivePinia(createPinia());
    const auth = useAuthStore();
    auth.user = { id: 5, username: 'me' };
    apiRequest.get.mockResolvedValue({ conversations: [] });
    store = useMessagesStore();
  });

  it('binds socket listeners and loads conversations on init', async () => {
    store.init();
    expect(fakeSocket.on).toHaveBeenCalledWith('messages:new', expect.any(Function));
    expect(fakeSocket.on).toHaveBeenCalledWith('messages:inbox', expect.any(Function));
    expect(apiRequest.get).toHaveBeenCalledWith('/messages/conversations');
  });

  it('computes total unread across conversations', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1, unreadCount: 2 }), sampleConversation({ id: 3, unreadCount: 5 })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();
    expect(store.totalUnread).toBe(7);
  });

  it('tracks presence from snapshot and updates', () => {
    store.init();
    emit('presence:snapshot', { onlineUserIds: [2, 8] });
    expect(store.isUserOnline(2)).toBe(true);
    expect(store.isUserOnline(9)).toBe(false);

    emit('presence:update', { userId: 9, online: true });
    expect(store.isUserOnline(9)).toBe(true);
    emit('presence:update', { userId: 2, online: false });
    expect(store.isUserOnline(2)).toBe(false);
  });

  it('increments unread on inbox events for other users when conversation is not open', async () => {
    apiRequest.get.mockResolvedValue({ conversations: [sampleConversation({ id: 1, unreadCount: 0 })] });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    emit('messages:inbox', {
      conversationId: 1,
      message: { id: 10, body: 'hi', createdAt: 'now', sender: { id: 2, name: 'Bob' } },
    });

    const convo = store.conversations.find((c) => c.id === 1);
    expect(convo.unreadCount).toBe(1);
    expect(convo.lastMessage.body).toBe('hi');
  });

  it('does not increment unread for the user\'s own inbox events', async () => {
    apiRequest.get.mockResolvedValue({ conversations: [sampleConversation({ id: 1, unreadCount: 0 })] });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    emit('messages:inbox', {
      conversationId: 1,
      message: { id: 11, body: 'mine', createdAt: 'now', sender: { id: 5, name: 'me' } },
    });

    expect(store.conversations.find((c) => c.id === 1).unreadCount).toBe(0);
  });

  it('dedupes messages:new by server id', async () => {
    apiRequest.get.mockResolvedValue({ conversations: [sampleConversation({ id: 1 })] });
    apiRequest.get.mockResolvedValueOnce({ conversations: [sampleConversation({ id: 1 })] });
    store.init();
    await Promise.resolve();
    store.activeConversationId = 1;
    store.threads[1] = { items: [], loading: false, error: null, hasMore: false };

    const msg = { id: 99, conversationId: 1, body: 'hey', createdAt: 'now', sender: { id: 2, name: 'Bob' } };
    emit('messages:new', msg);
    emit('messages:new', msg);

    expect(store.threads[1].items).toHaveLength(1);
  });

  it('sends via socket ack and resolves with the server message', async () => {
    store.init();
    fakeSocket.emit.mockImplementation((event, payload, ack) => {
      if (event === 'messages:send') ack({ ok: true, message: { id: 1, body: payload.body } });
    });
    const result = await store.sendMessage(1, 'hello');
    expect(fakeSocket.emit).toHaveBeenCalledWith('messages:send', expect.objectContaining({ conversationId: 1, body: 'hello' }), expect.any(Function));
    expect(result).toEqual({ id: 1, body: 'hello' });
  });

  it('rejects sendMessage when the server nacks', async () => {
    store.init();
    fakeSocket.emit.mockImplementation((event, payload, ack) => {
      if (event === 'messages:send') ack({ ok: false, error: 'too fast' });
    });
    await expect(store.sendMessage(1, 'spam')).rejects.toThrow('too fast');
  });

  it('uploads an image as multipart form data', async () => {
    store.init();
    apiRequest.postFormData.mockResolvedValue({ message: { id: 7, imageUrl: '/uploads/messages/x.png' } });
    const file = new Blob(['x'], { type: 'image/png' });
    const result = await store.sendImage(1, file, 'caption');
    expect(apiRequest.postFormData).toHaveBeenCalledWith('/messages/conversations/1/images', expect.any(FormData));
    expect(result).toEqual({ id: 7, imageUrl: '/uploads/messages/x.png' });
  });

  it('completes the linked order and updates its status locally', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1, order: { id: 12, status: 'accepted', deliveredAt: null } })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    apiRequest.patch.mockResolvedValue({ request: { status: 'completed', deliveredAt: '2026-01-01T00:00:00Z' } });
    await store.completeOrder(1);

    expect(apiRequest.patch).toHaveBeenCalledWith('/requests/12/complete', {});
    expect(store.conversations.find((c) => c.id === 1).order.status).toBe('completed');
  });

  it('completes the specific order passed (not just the linked one)', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1, order: { id: 12, status: 'accepted' } })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    apiRequest.patch.mockResolvedValue({ request: { id: 30, status: 'completed' } });
    await store.completeOrder(1, 30);

    expect(apiRequest.patch).toHaveBeenCalledWith('/requests/30/complete', {});
  });

  it('marks the specific order as picked up', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1, order: { id: 12, status: 'accepted' } })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    apiRequest.patch.mockResolvedValue({ request: { id: 31, status: 'accepted', collectedAt: 't' } });
    await store.markPickedUp(1, 31);

    expect(apiRequest.patch).toHaveBeenCalledWith('/requests/31/collected', {});
  });

  it('refreshes a conversation when its linked order changes elsewhere', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1, order: { id: 12, status: 'accepted' } })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    apiRequest.get.mockResolvedValue({
      conversation: sampleConversation({ id: 1, order: { id: 12, status: 'completed' } }),
    });
    emit('request:completed', { id: 12 });
    await Promise.resolve();
    await Promise.resolve();

    expect(apiRequest.get).toHaveBeenCalledWith('/messages/conversations/1');
  });

  it('deletes a conversation and removes it locally', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1 }), sampleConversation({ id: 2 })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    apiRequest.delete.mockResolvedValue({ ok: true });
    await store.deleteConversation(1);

    expect(apiRequest.delete).toHaveBeenCalledWith('/messages/conversations/1');
    expect(store.conversations.map((c) => c.id)).toEqual([2]);
  });

  it('mirrors a cleared conversation from another tab', async () => {
    apiRequest.get.mockResolvedValue({
      conversations: [sampleConversation({ id: 1 }), sampleConversation({ id: 2 })],
    });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    emit('messages:conversationCleared', { conversationId: 2 });
    expect(store.conversations.map((c) => c.id)).toEqual([1]);
  });

  it('marks a conversation read, zeroing its unread count', async () => {
    apiRequest.get.mockResolvedValue({ conversations: [sampleConversation({ id: 1, unreadCount: 4 })] });
    store.init();
    await Promise.resolve();
    await Promise.resolve();

    store.markRead(1);
    expect(store.conversations.find((c) => c.id === 1).unreadCount).toBe(0);
    expect(fakeSocket.emit).toHaveBeenCalledWith('messages:read', { conversationId: 1, messageId: undefined });
  });
});
