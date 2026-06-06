const CACHE = 'jlpt-v1';
const PRECACHE = ['./index.html', './style-test.css', './script-test.js', './manifest.json', './icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Firebase / CDN 요청은 캐시하지 않음
  const url = e.request.url;
  if (url.includes('firebasejs') || url.includes('firebaseio') || url.includes('googleapis') || url.includes('unpkg.com')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
