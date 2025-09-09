/**
 * XativaBot PWA - Service Worker (robusto y limpio)
 * - Cache versioning + precache seguro
 * - Estrategias por tipo de recurso
 * - Background Sync de reservas → /.netlify/functions/reservations
 */

const CACHE_PREFIX  = 'xativabot-cache';
const CACHE_VERSION = 'v5'; // ← súbelo al cambiar este archivo
const STATIC_CACHE  = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/', '/index.html',
  '/styles.css', '/app.js',
  '/install.js',         // si no existe, se ignora
  '/qr.html',            // si no existe, se ignora
  '/manifest.json', OFFLINE_URL,

  // Imágenes / iconos (si faltan, no rompe)
  '/images/xativa-logo.png',
  '/images/alexbot-chef.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/icon-192x192-maskable.png',
  '/images/icon-512x512-maskable.png',
  '/images/apple-touch-icon-180.png',
  '/images/reserve-icon.png',
  '/images/menu-icon.png',

  // Datos culinarios (si usas estos)
  '/data/menu.json',
  '/data/lore.json',
  '/data/season_es.json',

  // Google Fonts CSS (el binario se cachea aparte)
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400;500&display=swap'
];

// ========= Utilidades =========

// Precarga segura: ignora 404/errores
async function addAllSafe(cache, urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res && res.ok) await cache.put(url, res);
    } catch (_) { /* ignorar */ }
  }
}

const isHTML = (req) => {
  const accept = req.headers.get('accept') || '';
  return accept.includes('text/html') || req.mode === 'navigate';
};

// ========= Install / Activate =========

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

// ========= Fetch strategies =========

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET para cachear
  if (req.method !== 'GET') return;

  // Google Fonts CSS → network-first con fallback a cache
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

  // HTML → network-first con fallback a cache y por último offline.html
  if (isHTML(req)) {
    event.respondWith(
      fetch(req)
        .then((r) => {
          // Actualiza cache en segundo plano
          caches.open(STATIC_CACHE).then((c) => c.put(req, r.clone()));
          return r;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match(OFFLINE_URL);
        })
    );
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

  // Por defecto → cache, luego red
  event.respondWith(
    caches.match(req).then((m) => m || fetch(req).catch(() => m))
  );
});

// ========= Background Sync: reservas =========

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
        // Si falla uno, continúa con el resto (no rompemos el loop)
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

// IMPORTANTE: apuntamos a la Function de Netlify
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

// ========= (Opcional) Push Notifications =========
// self.addEventListener('push', (event) => { /* … */ });
// self.addEventListener('notificationclick', (event) => { /* … */ });
