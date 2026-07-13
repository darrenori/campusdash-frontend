import { apiRequest } from './api';

const SW_URL = '/sw.js';

//push needs all three pieces. iOS only gained them in 16.4 (and only for
//installed PWAs), so this guards the whole flow behind a single check.
export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const notificationPermission = () =>
  'Notification' in window ? Notification.permission : 'denied';

let registration = null;

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  if (registration) return registration;
  registration = await navigator.serviceWorker.register(SW_URL);
  return registration;
}

//VAPID keys are handed to us as URL-safe base64; PushManager wants raw bytes
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

//ask the OS for permission and register this device for push. Has to run from a
//user gesture or the browser rejects the prompt outright. Returns a short status
//string so the caller can explain the outcome.
export async function enablePush() {
  if (!pushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;

  const { publicKey, enabled } = await apiRequest.get('/notifications/vapid-public-key');
  if (!enabled || !publicKey) return 'unavailable';

  const reg = await registerServiceWorker();
  if (!reg) return 'unsupported';
  await navigator.serviceWorker.ready;

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await apiRequest.post('/notifications/push/subscribe', { subscription: subscription.toJSON() });
  return 'granted';
}

//drop this device's subscription locally and on the server
export async function disablePush() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = reg && (await reg.pushManager.getSubscription());
  if (!subscription) return;

  const { endpoint } = subscription.toJSON();
  await subscription.unsubscribe().catch(() => {});
  await apiRequest.post('/notifications/push/unsubscribe', { endpoint }).catch(() => {});
}

//true when this browser already holds a live push subscription
export async function hasPushSubscription() {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const subscription = reg && (await reg.pushManager.getSubscription());
    return Boolean(subscription);
  } catch {
    return false;
  }
}

//plain-language reason an enable attempt failed, shared by the profile toggle
//and the notification sheet so their wording can't drift apart. The old copy
//always blamed an untrusted origin and hardcoded a localhost URL, which is
//nonsense on the deployed site, so the trusted-origin hint only shows on a
//local build now.
export function pushFailureReason(result, lastError) {
  if (result === 'unsupported')
    return "This browser or device can't receive push notifications. On iPhone, add CampusDash to your Home Screen first.";
  if (result === 'unavailable')
    return "Push notifications aren't switched on for CampusDash right now.";
  if (result === 'default')
    return 'The notification prompt was dismissed. Tap again to allow alerts.';

  const reason = (lastError || 'This device could not subscribe').replace(/\.\s*$/, '');
  const onDevOrigin = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  return onDevOrigin
    ? `${reason}. On a local build, open a trusted origin like https://localhost:5173.`
    : `${reason}.`;
}

//surface an OS notification straight from the page. Only used as a fallback when
//the tab is backgrounded and web push isn't carrying the load; stays silent if
//permission was never granted.
export async function showLocalNotification(title, options = {}) {
  if (notificationPermission() !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    //a failed OS toast must never bubble into the app flow
  }
}
