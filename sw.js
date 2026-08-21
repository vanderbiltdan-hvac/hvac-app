const CACHE_NAME = 'platts-hvac-shell-v2';
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache', CACHE_NAME);
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('platts-hvac-shell-') && cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Only handle GET requests from the same origin
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  if (url.pathname.endsWith('/pages-registry.js') || url.pathname === 'pages-registry.js') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'no-store' }))
        .then(networkResponse => networkResponse)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If we got a valid response, return it (we don't dynamically cache here to remain conservative)
        return networkResponse;
      })
      .catch(() => {
        // Network failed, try to serve from cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If not in cache and network fails, do nothing (browser will show its offline page)
        });
      })
  );
});
