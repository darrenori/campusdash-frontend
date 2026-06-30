//CampusDash push service worker. Intentionally tiny: it only wakes to show a
//pushed notification and to focus the app when one is tapped. No offline
//caching — the app is online-first, so a caching worker would only get in the
//way of fresh deploys.

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'CampusDash', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'CampusDash';
  const options = {
    body: payload.body || '',
    tag: payload.tag,
    //a tag replaces an older notification with the same key (e.g. same chat);
    //renotify makes the device buzz again instead of silently swapping it
    renotify: Boolean(payload.tag),
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      //focus an already-open tab and steer it to the target rather than piling
      //up new windows
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && target) client.navigate(target).catch(() => {});
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});

//take over as soon as a new worker is deployed so pushes aren't handled by a
//stale version
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
