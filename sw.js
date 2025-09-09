/**
 * XativaBot PWA - Service Worker (v6)
 * - App Shell fallback para navegaciones HTML (arregla falsos "offline")
 * - Cache versioning + precache seguro
 * - Estrategias por tipo
 * - Background Sync reservas → /.netlify/functions/reservations
 */

const CACHE_PREFIX  = 'xativabot-cache';
const CACHE_VERSION = 'v6';
const STATIC_CACHE  = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';
const APP_SHELL  = '/index.html';

const PRECACHE_ASSETS = [
  '/', APP_SHELL,
  '/styles.css', '/app.js',
  '/install.js',     // si no existen, se ignoran
  '/qr.html',
  '/manifest.json', OFFLINE_URL,

  // Imágenes / iconos (no rompe si faltan)
  '/images/xativa-logo.png',
  '/images/alexbot-chef.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/icon-192x192-maskable.png',
  '/images/icon-512x512-maskable.png',
  '/images/apple-touch-icon-180.png',
  '/images/reserve-icon.png',
  '/images/menu-icon.png',

  // Datos culinarios (si los usas)
  '/data/menu.json',
  '/data/lore.json',
  '/data/season_es.json',

  // Google Fonts CSS
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400;500&display=swap'
];

// ===== utils =====
async function addAllSafe(cache, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res && res.ok) await cache.put(url, res);
    } catch (_) {}
  }
}

const isHTML = (req) => {
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html') || req.mode === 'navigate';
};

// ===== install / activate =====
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
    await Promise.all(
      keys
        .filter(k => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ===== fetch =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Sólo GET cacheable
  if (req.method !== 'GET') return;

  // Google Fonts CSS → network-first
  if (url.origin.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.open('gf-css').then(async (c) => {
        try {
          const r = await fetch(req);
          if (r && r.ok) c.put(req, r.clone());
          return r;
        } catch {
          return c.match(req);
        }
      })
    );
    return;
  }

  // Google Fonts binarios → cache-first
  if (url.origin.includes('fonts.gstatic')) {
    event.respondWith(
      caches.open('gf-fonts').then(async (c) => {
        const m = await c.match(req);
        if (m) return m;
        const r = await fetch(req).catch(() => null);
        if (r && r.ok) c.put(req, r.clone());
        return r || m || Response.error();
      })
    );
    return;
  }

  // Navegaciones HTML → network-first con fallback a App Shell y, por último, offline.html
  if (isHTML(req)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Actualiza en segundo plano la URL exacta y el shell
        caches.open(STATIC_CACHE).then(async (c) => {
          try { c.put(req, fresh.clone()); } catch {}
          try {
            const shell = await c.match(APP_SHELL);
            if (!shell && url.pathname !== APP_SHELL) {
              // Guarda shell si aún no está
              const shellRes = await fetch(APP_SHELL).catch(()=>null);
              if (shellRes && shellRes.ok) c.put(APP_SHELL, shellRes.clone());
            }
          } catch {}
        });
        return fresh;
      } catch (err) {
        // 1) intenta caché de la URL
        let cached = await caches.match(req);
        // 2) si no hay, cae al App Shell
        if (!cached) cached = await caches.match(APP_SHELL);
        // 3) si tampoco, cae al offline
        return cached || caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  // Imágenes → cache-first
  if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open('img-cache').then(async (c) => {
        const m = await c.match(req);
        if (m) return m;
        const r = await fetch(req).catch(() => null);
        if (r && r.ok) c.put(req, r.clone());
        return r || m || Response.error();
      })
    );
    return;
  }

  // JS / CSS → stale-while-revalidate
  if (/\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open('assets-swr').then(async (c) => {
        const m = await c.match(req);
        const p = fetch(req)
          .then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; })
          .catch(() => m);
        return m || p;
      })
    );
    return;
  }

  // Por defecto
  event.respondWith(
    caches.match(req).then((m) => m || fetch(req).catch(() => m))
  );
});

// ===== Background Sync: reservas → Netlify Function =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'reservation-sync') {
    event.waitUntil(syncReservations());
  }
});

async function syncReservations() {
  try {
    const db = await openReservationDB();
    const pending = await getAllReservations(db);
    for (const reservation of pending) {
      try {
        const ok = await sendReservation(reservation);
        if (ok) await deleteReservation(db, reservation.id);
      } catch (e) {
        console.error('Failed to sync one reservation:', e);
      }
    }
  } catch (e) {
    console.error('Error in syncReservations:', e);
  }
}

function openReservationDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('xativabot-db', 1);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains('reservations')) {
        db.createObjectStore('reservations', { keyPath: 'id' });
      }
    };
    req.onsuccess = (ev) => resolve(ev.target.result);
    req.onerror = (ev) => reject(ev.target.error);
  });
}

function getAllReservations(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['reservations'], 'readonly');
    const store = tx.objectStore('reservations');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function deleteReservation(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['reservations'], 'readwrite');
    const store = tx.objectStore('reservations');
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function sendReservation(reservation) {
  const resp = await fetch('/.netlify/functions/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation)
  }).catch(() => null);

  if (!resp || !resp.ok) {
    const text = resp ? await resp.text().catch(() => '') : '(no response)';
    throw new Error(`Reservation POST failed: ${text}`);
  }
  const json = await resp.json().catch(() => ({}));
  return !!json?.ok;
}
