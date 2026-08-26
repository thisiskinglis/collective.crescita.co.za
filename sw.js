// CRESCITA PWA + PUSH SERVICE WORKER - vFINAL FIX 2343
const CACHE_NAME = 'crescita-v4-final-2343';
const STATIC_ASSETS = ['/manifest.json', '/icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS).catch(()=>{}) )
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => {
      if (k !== CACHE_NAME) return caches.delete(k);
    }))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isHTML = e.request.destination === 'document' || e.request.headers.get('accept')?.includes('text/html') || url.pathname.startsWith('/app/') || url.pathname === '/';

  if (isHTML) {
    // NETWORK FIRST for HTML - always get fresh app/index.html
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          // Optionally cache fresh copy
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(()=> caches.match(e.request).then(cached => cached || caches.match('/app/') || fetch(e.request)))
    );
    return;
  }

  // For assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res=>{
      const clone=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(e.request, clone));
      return res;
    }).catch(()=>cached))
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
