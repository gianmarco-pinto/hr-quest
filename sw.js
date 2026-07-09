// HR Quest service worker — offline app shell + fresh updates online.
const CACHE = 'hrq-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Cross-origin (Supabase leaderboard, ecc.): sempre rete, mai cache.
  if (url.origin !== self.location.origin) return;

  // HTML dell'app: network-first (aggiornamenti quando sei online), cache offline.
  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Altri asset stessi-origine (icone, manifest): cache-first.
  e.respondWith(
    caches.match(req).then(c => c || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(ca => ca.put(req, copy)); return res;
    }))
  );
});
