// Retire the old browser-download feature for previously registered clients.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const prefix = `school142-tour-v1:${new URL(self.registration.scope).pathname}:`;
  for (const name of await caches.keys()) {
    if (name.startsWith(prefix)) await caches.delete(name);
  }
  await self.clients.claim();
  await self.registration.unregister();
})()));
