// CRESCITA PWA + PUSH SERVICE WORKER
const CACHE_NAME = 'crescita-v3-push';
const ASSETS = ['/', '/app/', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(()=> caches.match('/app/')))
  );
});

// === PUSH NOTIFICATION HANDLER ===
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } 
  catch { data = { title: event.data ? event.data.text() : 'CRESCITA', body: 'New update' }; }

  const title = data.title || 'CRESCITA COLLECTIVE';
  const options = {
    body: data.body || 'New Performance Programme just dropped',
    icon: '/icon-512.png',
    badge: '/icon-512.png',
    image: data.image || undefined,
    data: { url: data.url || '/app/' },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'OPEN APP' },
      { action: 'dismiss', title: 'Later' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  
  const url = event.notification.data.url || '/app/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes('/app') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
