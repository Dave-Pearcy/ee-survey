// Ease Electrical Site Survey - Service Worker
// Caches the app for offline use on iOS/iPad

const CACHE_NAME = 'ee-survey-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://alcdn.msauth.net/browser/3.27.0/js/msal-browser.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache (may be offline):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Network first for Microsoft auth endpoints (must be live)
  const url = event.request.url;
  if (url.includes('login.microsoftonline.com') || url.includes('graph.microsoft.com')) {
    return; // Let browser handle auth/graph requests directly
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
