'use strict';
/* Upwork Kenya — Service Worker
   Enables: real "Install app" prompt, offline shell, push-style notifications.
   Network-only for /api/ calls so live data is never served stale. */

const CACHE_NAME = 'upwork-kenya-v2.3.0'; // v2.3.0: file-upload task verification, Complete Transaction, partial withdrawals; bump forces old cached JS out on every installed device
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* API + auth: always go to network, never cache */
  if (url.pathname.indexOf('/api/') !== -1) return;
  /* Cross-origin (fonts etc.): network with cache fallback */
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  /* Same-origin static: cache-first, then network, then offline shell */
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        /* Only ever cache clean, same-origin 200 responses. A single cached
           error/opaque response is what poisoned the shell and made Chrome
           show "Request failed" on login until the user went incognito. */
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});

/* Show notifications sent from the page or push */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  /* The page can force an instant upgrade to the newest worker (used to flush
     a stale cached build that is causing request failures). */
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
