<script setup>
import { onMounted, onUnmounted } from 'vue';

import { getSocket } from '../utils/socket';
import { notificationPermission, showLocalNotification } from '../utils/push';
import { useAuthStore } from '../stores/auth';
import { useMessagesStore } from '../stores/messages';
import { useNotificationsStore } from '../stores/notifications';

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

function onNotificationNew(dto) {
  maybeSystemNotify(dto.title, dto.body || '', dto.data || {});
}

function onArrival({ name, item }) {
  const who = name || 'Your order mate';
  const summary = `${who} is online`;
  const detail = item ? `Back on CampusDash for your ${item}.` : 'They just came online.';
  maybeSystemNotify(summary, detail, { url: '/' });
}

//chat isn't in the notification centre, but a message still deserves a
//background nudge when you're not already looking at that thread
function onInbox({ conversationId, message }) {
  if (!message || message.sender?.id === auth.user?.id) return;
  if (conversationId === messages.activeConversationId) return;

  const summary = message.sender?.name || 'New message';
  const preview = message.body || (message.imageUrl ? 'Sent a photo' : 'New message');
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
