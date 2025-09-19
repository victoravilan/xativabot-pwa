/**
 * XativaBot PWA - Service Worker (cache v5 + juego)
 */
const CACHE_PREFIX = 'xativabot-cache';
const CACHE_VERSION = 'v5';
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json', OFFLINE_URL,
  // juego
  '/game/culinary-game.html',
  // imágenes e iconos
  '/images/Simbolo_A_verde.svg',
  '/images/xativa-logo.png',
  '/images/chef-avatar.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/icon-192x192-maskable.png',
  '/images/icon-512x512-maskable.png',
  '/images/apple-touch-icon-180.png',
  // datos culinarios
  '/data/menu.json', '/data/lore.json', '/data/season_es.json'
];

// addAll seguro (ignora 404)
async function addAllSafe(cache, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) await cache.put(url, res.clone());
    } catch (e) { /* ignore */ }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await addAllSafe(cache, PRECACHE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(k => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE)
      .map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isHTML = (req) => req.headers.get('accept')?.includes('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Google Fonts CSS
  if (url.origin.includes('fonts.googleapis')) {
    event.respondWith(
      caches.open('gf-css').then((c) =>
        fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => c.match(req))
      )
    ); return;
  }
  // Google Fonts binary
  if (url.origin.includes('fonts.gstatic')) {
    event.respondWith(
      caches.open('gf-fonts').then(async (c) => {
        const m = await c.match(req); if (m) return m;
        const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r;
      })
    ); return;
  }

  if (req.method !== 'GET') return;

  // HTML → network-first con fallback
  if (isHTML(req)) {
    event.respondWith(
      fetch(req).then(r => { caches.open(STATIC_CACHE).then(c => c.put(req, r.clone())); return r; })
                .catch(() => caches.match(req).then(m => m || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // imágenes → cache-first
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open('img-cache').then(async (c) => {
        const m = await c.match(req); if (m) return m;
        try {
          const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r;
        } catch(e){ return m || Response.error(); }
      })
    ); return;
  }

  // js/css → stale-while-revalidate
  if (/\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open('assets-swr').then(async (c) => {
        const m = await c.match(req);
        const p = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => m);
        return m || p;
      })
    ); return;
  }

  // default
  event.respondWith(
    caches.match(req).then(m => m || fetch(req).catch(() => m))
  );
});
