// Display-only service worker. It exists because some mobile browsers refuse
// `new Notification()` from a page. It has no fetch handler, caches nothing and
// does no background work, so it can never pin an old build.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      if (windows.length > 0) return windows[0].focus();
      return self.clients.openWindow('./');
    }),
  );
});
