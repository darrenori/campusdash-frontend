<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';

import { getSocket } from '../utils/socket';
import { notificationPermission, showLocalNotification } from '../utils/push';
import { useAuthStore } from '../stores/auth';
import { useMessagesStore } from '../stores/messages';
import { useNotificationsStore } from '../stores/notifications';

const toast = useToast();
const auth = useAuthStore();
const messages = useMessagesStore();
const notifications = useNotificationsStore();

let socket = null;

//only raise an OS notification when the tab is hidden AND web push isn't already
//covering this device — otherwise the pushed copy and this one would double up
function maybeSystemNotify(title, body, data) {
  if (!document.hidden) return;
  if (notifications.pushEnabled) return;
  if (notificationPermission() !== 'granted') return;
  showLocalNotification(title, {
    body,
    data,
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
  });
}

function severityFor(type) {
  if (type === 'request_cancelled') return 'warn';
  if (type === 'request_completed') return 'success';
  return 'info';
}

function onNotificationNew(dto) {
  toast.add({ severity: severityFor(dto.type), summary: dto.title, detail: dto.body || '', life: 5000 });
  maybeSystemNotify(dto.title, dto.body || '', dto.data || {});
}

function onArrival({ name, item }) {
  const who = name || 'Your order mate';
  const summary = `${who} is online`;
  const detail = item ? `Back on CampusDash for your ${item}.` : 'They just came online.';
  toast.add({ severity: 'info', summary, detail, life: 4000 });
  maybeSystemNotify(summary, detail, { url: '/' });
}

//chat isn't in the notification centre, but a message still deserves a toast and
//a background nudge when you're not already looking at that thread
function onInbox({ conversationId, message }) {
  if (!message || message.sender?.id === auth.user?.id) return;
  if (conversationId === messages.activeConversationId) return;

  const summary = message.sender?.name || 'New message';
  const preview = message.body || (message.imageUrl ? 'Sent a photo' : 'New message');
  toast.add({ severity: 'info', summary, detail: preview, life: 4500 });
  maybeSystemNotify(summary, preview, { url: '/messages', conversationId });
}

onMounted(() => {
  socket = getSocket();
  socket.on('notifications:new', onNotificationNew);
  socket.on('notification:arrival', onArrival);
  socket.on('messages:inbox', onInbox);
});

onUnmounted(() => {
  socket?.off('notifications:new', onNotificationNew);
  socket?.off('notification:arrival', onArrival);
  socket?.off('messages:inbox', onInbox);
  socket = null;
});
</script>

<template></template>
