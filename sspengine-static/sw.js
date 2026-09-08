// Master Trust Engine — app-shell service worker.
// Scope: this file only makes the installed app open instantly and survive a
// dropped connection. It never touches /api/* (Spalty, the Examiner, stem
// separation, sessions) — those are live by design and must always hit the
// network. Bump CACHE_NAME on any shell change so old installs pick up the
// new version instead of getting stuck on a stale copy.
const CACHE_NAME = 'mte-shell-v1';
const SHELL_FILES = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isApi = isSameOrigin && url.pathname.startsWith('/api/');

  // Never intercept API calls or cross-origin requests (fonts, CDN scripts,
  // the Anthropic fallback) — those must always be live.
  if (isApi || !isSameOrigin) return;

  // Network-first for the app shell: prefer the live copy, fall back to the
  // cached one only when offline, so a stale cache is never shown while
  // online (the exact caching confusion this build has already run into once).
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
  );
});
