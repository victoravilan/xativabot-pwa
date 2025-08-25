/**
 * XativaBot PWA - Service Worker
 * Handles caching and offline functionality
 */

const CACHE_NAME = 'xativabot-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/images/xativa-logo.png',
  '/images/alexbot-chef.png',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/reserve-icon.png',
  '/images/menu-icon.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Roboto:wght@300;400;500&display=swap'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') && 
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses or non-GET requests
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }
            
            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            // If both cache and network fail, serve offline page
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            console.error('Fetch failed:', error);
            throw error;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'New message from Xativa Restaurants',
    icon: '/images/icon-192x192.png',
    badge: '/images/badge.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'XativaBot Update',
      options
    )
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Handle background sync for offline form submissions
self.addEventListener('sync', event => {
  if (event.tag === 'reservation-sync') {
    event.waitUntil(syncReservations());
  }
});

// Function to sync stored reservations when back online
async function syncReservations() {
  try {
    const db = await openDatabase();
    const pendingReservations = await getPendingReservations(db);
    
    for (const reservation of pendingReservations) {
      try {
        await sendReservation(reservation);
        await markReservationAsSynced(db, reservation.id);
      } catch (error) {
        console.error('Failed to sync reservation:', error);
      }
    }
  } catch (error) {
    console.error('Error in syncReservations:', error);
  }
}

// Helper functions for IndexedDB operations
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('xativabot-db', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('reservations')) {
        db.createObjectStore('reservations', { keyPath: 'id' });
      }
    };
    
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

function getPendingReservations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reservations'], 'readonly');
    const store = transaction.objectStore('reservations');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function markReservationAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reservations'], 'readwrite');
    const store = transaction.objectStore('reservations');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function sendReservation(reservation) {
  return fetch('/api/reservations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(reservation)
  }).then(response => {
    if (!response.ok) {
      throw new Error('Failed to submit reservation');
    }
    return response.json();
  });
}