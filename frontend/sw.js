'use strict';
/* Upwork Kenya — Service Worker v3.0.0
   ------------------------------------------------------------
   KEY CHANGE vs v2: NETWORK-FIRST for HTML/JS/CSS.
   The old cache-first strategy is what kept stale builds (with the wrong API
   base / an old login) stuck inside a browser until the user went incognito.
   Now every browser ALWAYS fetches the freshest page/scripts when online and
   only falls back to cache when offline — so no account ever "stacks" on an
   old build again. /api/ calls remain strictly network-only (live data).
   PWA install, offline shell, notifications and push are fully preserved. */

const CACHE_NAME = 'upwork-kenya-v3.0.0'; // bump on every deploy — wipes old caches on activate
const SHELL = [
  'index.html',
  'app.html',
  'login.html',
  'register.html',
  'forgot.html',
  'reset.html',
  'manifest.json',
  'css/style.css',
  'js/config.js',
  'js/common.js',
  'js/install.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Only clean same-origin 200 responses are ever written to cache — a cached
   error/opaque response is what used to poison the shell. */
function putIfClean(req, res) {
  if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* API + auth: always network, never cached */
  if (url.pathname.indexOf('/api/') !== -1) return;

  /* Cross-origin (fonts etc.): network with cache fallback */
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  const dest = req.destination; // 'document' | 'script' | 'style' | 'image' | ''
  const isCode = dest === 'document' || dest === 'script' || dest === 'style'
    || /\.(html?|js|css|json)(\?|$)/i.test(url.pathname);

  if (isCode) {
    /* NETWORK-FIRST — the freshest build always wins when online; cache is the
       offline fallback only. This is the auto-cache-clear behaviour: a redeploy
       is picked up by every browser on the very next load. */
    event.respondWith(
      fetch(req)
        .then((res) => putIfClean(req, res))
        .catch(() => caches.match(req).then((hit) => {
          if (hit) return hit;
          /* Offline + never-cached page: serve the shell for navigations. */
          return dest === 'document' ? caches.match('index.html') : Response.error();
        }))
    );
    return;
  }

  /* Images/icons: cache-first (they never change), then network. */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => putIfClean(req, res))
        .catch(() => caches.match('index.html'));
    })
  );
});

/* Show notifications sent from the page or push */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  /* The page can force an instant upgrade to the newest worker. */
  if (data.type === 'SKIP_WAITING') { self.skipWaiting(); return; }
  if (data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(data.title || 'Upwork Kenya', {
      body: data.body || '',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-96.png',
      tag: data.tag || 'uk-general',
      renotify: true,
      data: { url: data.url || 'app.html' },
      actions: [{ action: 'open', title: 'Open app' }]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || 'app.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) { if ('focus' in c) { c.navigate(target); return c.focus(); } }
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Upwork Kenya', {
      body: payload.body || 'You have a new update.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-96.png',
      data: { url: payload.url || 'app.html' }
    })
  );
});
