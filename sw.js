/**
 * XativaBot PWA - Service Worker (Netlify-optimized)
 * Estrategias: HTML network-first; JS/CSS SWR; imágenes cache-first; Google Fonts óptimo.
 */

const CACHE_PREFIX = 'xativabot-cache';
const CACHE_VERSION = 'v2';
const STATIC_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;

const OFFLINE_URL = '/offline.html';

// Si usas Netlify Functions, por defecto el endpoint es /.netlify/functions/<name>
const RESERVATION_ENDPOINT = '/.netlify/functions/reservations'; 
// Si ya tienes un backend propio, usa: const RESERVATION_ENDPOINT = '/api/reservations';

const PRECACHE_ASSETS = [
  '/',               // navegación raíz
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  OFFLINE_URL,
  // Logos / imágenes esenciales (ajusta según existan):
  '/images/xativa-logo.png',
  '/images/alexbot-chef.png',
  // Iconos PWA (ajusta si los moviste a /icon/)
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/reserve-icon.png',
  '/images/menu-icon.png'
];

// --------- Utils ---------
const isHTML = (req) => req.headers.get('accept')?.includes('text/html');
const isSameOrigin = (url) => url.origin === self.location.origin;

// Limitar tamaño de un caché (FIFO simple)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await cache.delete(keys[0]);
    return trimCache(cacheName, maxEntries);
  }
}

// --------- Install ---------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --------- Activate ---------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// --------- Fetch ---------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Google Fonts – CSS: SWR
  if (url.origin === 'https://fonts.googleapis.com') {
    event.respondWith(
      caches.open('gf-css').then((cache) =>
        fetch(req).then((res) => {
          cache.put(req, res.clone());
          return res;
        }).catch(() => cache.match(req))
      )
    );
    return;
  }

  // Google Fonts – archivos de fuentes: cache-first con TTL largo
  if (url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open('gf-fonts').then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        // Sólo cachea respuestas válidas
        if (res && res.status === 200 && req.method === 'GET') {
          cache.put(req, res.clone());
          // Limita para no crecer sin tope
          trimCache('gf-fonts', 30);
        }
        return res;
      })
    );
    return;
  }

  // Sólo manejamos GET
  if (req.method !== 'GET') return;

  // Navegaciones/HTML → network-first con fallback a caché y offline
  if (isHTML(req)) {
    event.respondWith(
      fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, resClone));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        return cached || caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Misma origen y assets estáticos
  if (isSameOrigin(url)) {
    const pathname = url.pathname;

    // Imágenes → cache-first con límite
    if (/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)) {
      event.respondWith(
        caches.open('img-cache').then(async (cache) => {
          const cached = await cache.match(req);
          if (cached) return cached;
          try {
            const res = await fetch(req);
            if (res && res.status === 200) {
              cache.put(req, res.clone());
              trimCache('img-cache', 80);
            }
            return res;
          } catch (e) {
            // Offline total → intenta un logo genérico si existe
            return caches.match('/images/xativa-logo.png') || Response.error();
          }
        })
      );
      return;
    }

    // JS/CSS → stale-while-revalidate
    if (/\.(js|css)$/i.test(pathname)) {
      event.respondWith(
        caches.open('assets-swr').then(async (cache) => {
          const cached = await cache.match(req);
          const fetchPromise = fetch(req)
            .then((res) => {
              if (res && res.status === 200) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached); // si falla red, devuelve caché
          return cached || fetchPromise;
        })
      );
      return;
    }
  }

  // Resto → intenta caché y luego red
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).catch(() => cached);
    })
  );
});

// --------- Push Notifications ---------
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch {}
  const options = {
    body: data.body || 'New message from Xativa Restaurants',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'XativaBot Update', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

// --------- Background Sync ---------
self.addEventListener('sync', (event) => {
  if (event.tag === 'reservation-sync') {
    event.waitUntil(syncReservations());
  }
});

async function syncReservations() {
  try {
    const db = await openDatabase();
    const pending = await getPendingReservations(db);
    for (const reservation of pending) {
      try {
        await sendReservation(reservation);
        await markReservationAsSynced(db, reservation.id);
      } catch (e) {
        console.error('Failed to sync reservation:', e);
      }
    }
  } catch (e) {
    console.error('Error in syncReservations:', e);
  }
}

// --------- IndexedDB helpers ---------
function openDatabase() {
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

function getPendingReservations(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['reservations'], 'readonly');
    const store = tx.objectStore('reservations');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function markReservationAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['reservations'], 'readwrite');
    const store = tx.objectStore('reservations');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function sendReservation(reservation) {
  const res = await fetch(RESERVATION_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reservation)
  });
  if (!res.ok) throw new Error('Failed to submit reservation');
  return res.json();
}
