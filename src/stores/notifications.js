import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiRequest } from '../utils/api';
import { getSocket } from '../utils/socket';
import {
  pushSupported,
  notificationPermission,
  enablePush,
  disablePush,
  hasPushSubscription,
} from '../utils/push';

export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref([]);
  const unreadCount = ref(0);
  const hasMore = ref(false);
  const loading = ref(false);
  const loaded = ref(false);

  const supported = pushSupported();
  const permission = ref(notificationPermission());
  const pushEnabled = ref(false); //this specific device is subscribed
  const busy = ref(false); //enable/disable request in flight

  let socket = null;
  let bound = false;

  function prepend(dto) {
    if (items.value.some((n) => n.id === dto.id)) return;
    items.value = [dto, ...items.value];
    if (!dto.read) unreadCount.value += 1;
  }

  function init() {
    if (bound) return;
    socket = getSocket();
    bound = true;
    socket.on('notifications:new', prepend);
    load();
    refreshPushState();
  }

  function teardown() {
    if (!bound || !socket) return;
    socket.off('notifications:new', prepend);
    bound = false;
    socket = null;
  }

  function reset() {
    teardown();
    items.value = [];
    unreadCount.value = 0;
    hasMore.value = false;
    loaded.value = false;
  }

  async function load({ before = null } = {}) {
    if (loading.value) return;
    loading.value = true;
    try {
      const query = before ? `?before=${before}` : '';
      const res = await apiRequest.get(`/notifications${query}`);
      items.value = before ? [...items.value, ...res.notifications] : res.notifications;
      hasMore.value = res.hasMore;
      unreadCount.value = res.unreadCount;
      loaded.value = true;
    } catch {
      //non-fatal — the badge just waits for the next event or visit
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return;
    const oldest = items.value[items.value.length - 1]?.id;
    if (oldest) await load({ before: oldest });
  }

  async function markAllRead() {
    if (unreadCount.value === 0) return;
    items.value = items.value.map((n) => (n.read ? n : { ...n, read: true }));
    unreadCount.value = 0;
    try {
      await apiRequest.post('/notifications/read', { all: true });
    } catch {
      //optimistic; a later load reconciles if this failed
    }
  }

  async function markRead(ids) {
    const target = new Set(ids);
    let cleared = 0;
    items.value = items.value.map((n) => {
      if (target.has(n.id) && !n.read) {
        cleared += 1;
        return { ...n, read: true };
      }
      return n;
    });
    unreadCount.value = Math.max(0, unreadCount.value - cleared);
    try {
      await apiRequest.post('/notifications/read', { ids: [...target] });
    } catch {
      //optimistic
    }
  }

  async function refreshPushState() {
    permission.value = notificationPermission();
    pushEnabled.value = permission.value === 'granted' && (await hasPushSubscription());
  }

  async function enable() {
    if (busy.value) return permission.value;
    busy.value = true;
    try {
      const result = await enablePush();
      await refreshPushState();
      return result;
    } finally {
      busy.value = false;
    }
  }

  async function disable() {
    if (busy.value) return;
    busy.value = true;
    try {
      await disablePush();
      await refreshPushState();
    } finally {
      busy.value = false;
    }
  }

  return {
    items,
    unreadCount,
    hasMore,
    loading,
    loaded,
    supported,
    permission,
    pushEnabled,
    busy,
    init,
    teardown,
    reset,
    load,
    loadMore,
    markAllRead,
    markRead,
    refreshPushState,
    enable,
    disable,
  };
});
