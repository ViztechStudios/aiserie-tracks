/* Aiserie Tracks PWA service worker — minimal offline shell.
 * - Navigations: network-first, fall back to the cached shell when offline.
 * - Static assets: cache-first (hashed filenames make this safe).
 * CACHE_VERSION is rewritten to `aiserie-v<app.json version>` by
 * scripts/patch-pwa-html.mjs on EVERY web export (v4.2.0) — a release can no
 * longer ship with a stale cache that never purges (v3.0.1 served through
 * v4.0 and v4.1).
 */
const CACHE_VERSION = 'aiserie-v4.2.0';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
