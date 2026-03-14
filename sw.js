// ============================================================
// Service Worker — Meelkazhani Silambam Academy PWA
// Cache-first for app shell, network-first for Firebase calls
// ============================================================

const CACHE_NAME = 'silambam-v1';

// App shell assets to cache on install
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  // CDN libraries (cache on first fetch via the fetch handler below)
];

// External origins we DON'T want to intercept (Firebase, CDN)
const BYPASS_ORIGINS = [
  'firebaseio.com',
  'googleapis.com',
  'gstatic.com',
  'cdnjs.cloudflare.com',
];

// ── Install: pre-cache the app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: stale-while-revalidate for CDN, cache-first for shell ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Let Firebase & auth traffic go straight to network
  if (BYPASS_ORIGINS.some(o => url.hostname.includes(o))) {
    return; // do not call event.respondWith → browser handles normally
  }

  // For everything else: Cache-first, fallback to network, update cache
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);

      // Return cached immediately if available; also revalidate in background
      return cached || networkFetch;
    })
  );
});

// ── Background sync placeholder (for future offline writes) ───
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    // Future: replay offline DB writes to Firebase here
    console.log('[SW] Background sync triggered');
  }
});
