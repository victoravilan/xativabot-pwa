/**
 * XativaBot PWA - Service Worker (robusto)
 */

const CACHE_PREFIX = 'xativabot-cache';
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/', '/index.html', '/styles.css', '/app.js', '/manifest.json', OFFLINE_URL,
  // imágenes previstas (si faltan, no falla)
  '/images/xativa-logo.png',
  '/images/375c86645a43b8c72c300a081a12ebf642aac8aa621ca08416da4c42ca3143d5.png',
  '/images/alexbot-chef.png',
  '/images/chef-avatar.png',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/Icon 192x192 XativaBot.png', '/icons/icon-512x512.png',
  // datos culinarios
  '/data/menu.json', '/data/lore.json'
];

// addAll seguro (ignora 404)
async function addAllSafe(cache, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) await cache.put(url, res);
    } catch (e) {
      // ignorar
    }
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
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const isHTML = (req) => req.headers.get('accept')?.includes('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Google Fonts
  if (url.origin.includes('fonts.googleapis')) {
    event.respondWith(
      caches.open('gf-css').then((c) =>
        fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => c.match(req))
      )
    ); return;
  }
  if (url.origin.includes('fonts.gstatic')) {
    event.respondWith(
      caches.open('gf-fonts').then(async (c) => {
        const m = await c.match(req); if (m) return m;
        const r = await fetch(req); if (r && r.ok) c.put(req, r.clone()); return r;
      })
    ); return;
  }

  if (req.method !== 'GET') return;

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

  event.respondWith(
    caches.match(req).then(m => m || fetch(req).catch(() => m))
  );

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/install.js',        // ← añade
  '/qr.html',           // ← añade
  '/manifest.json',
  '/images/xativa-logo.png',
  '/images/alexbot-chef.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/icon-192x192-maskable.png', // si los tienes
  '/images/icon-512x512-maskable.png',
  '/images/apple-touch-icon-180.png',
  '/images/reserve-icon.png',
  '/images/menu-icon.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400;500&display=swap'
];
// Nota: la librería de QR (CDN) es cross-origin; el SW no la podrá precachear.
// Si quieres, puedes descargarla localmente (por ejemplo en /vendor/qrcode.min.js) y añadirla aquí.

});
