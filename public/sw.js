// Service Worker for Plaisirs & Saveurs HACCP
// Ultra-fast auto-updating PWA cache & Background Notifications

const CACHE_VERSION = 'saveur-plaisir-v' + Date.now();
// Photos travaux & factures PDF : gardées en cache durablement (jamais re-téléchargées)
const MEDIA_CACHE = 'sp-media-v1';

// Install immediately and activate without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Clean up all old caches on activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== MEDIA_CACHE).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First with Fallback for fresh live data across all devices
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // HTML navigation & scripts: always fetch from network to get newest updates
  const isNavOrScript = event.request.mode === 'navigate' || 
                        event.request.destination === 'script' || 
                        event.request.destination === 'document';

  if (isNavOrScript) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and update cache in background
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Photos travaux & factures : cache d'abord, réseau seulement la 1ère fois
  const path = new URL(event.request.url).pathname;
  if (path.startsWith('/travaux/') || path.startsWith('/factures/')) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) =>
        cache.match(event.request).then(
          (hit) =>
            hit ||
            fetch(event.request).then((res) => {
              if (res && res.status === 200) cache.put(event.request, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }

  // Other assets (images, static files)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);

      return cached || networked;
    })
  );
});

// Helper: Show Big Cleaning Notification
function showSundayCleaningNotification(customBody) {
  const title = '🧹 PLAISIRS & SAVEURS • GRAND NETTOYAGE';
  const options = {
    body: customBody || '⚠️ Dimanche 12h00 : Grand Nettoyage & Désinfection complète obligatoire des machines, fournil & labo avant fermeture !',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [400, 150, 400, 150, 800, 300, 800],
    tag: 'grand-nettoyage-hebdo',
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/?tab=cleaning',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_cleaning', title: 'Ouvrir le Nettoyage' }
    ]
  };

  return self.registration.showNotification(title, options);
}

// Push Event from Web Push / Server
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }

  event.waitUntil(showSundayCleaningNotification(data.body));
});

// Notification Click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate('/?tab=cleaning');
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/?tab=cleaning');
      }
    })
  );
});

// Client PostMessage handler (Test Notification & Local Trigger)
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'TRIGGER_TEST_NOTIFICATION') {
    event.waitUntil(
      showSundayCleaningNotification(
        '🔔 Test réussi ! Alerte Grand Nettoyage programmée chaque Dimanche à 12h00 pour toute l\'équipe.'
      )
    );
  }

  if (event.data.type === 'TRIGGER_SUNDAY_CLEANING') {
    event.waitUntil(showSundayCleaningNotification());
  }
});

// Background periodic check for Sunday 12:00
let lastNotificationSunday = null;

function checkSundaySchedule() {
  const now = new Date();
  const day = now.getDay(); // 0 = Dimanche
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (day === 0 && hour === 12 && minute <= 30) {
    const todayStr = now.toDateString();
    if (lastNotificationSunday !== todayStr) {
      lastNotificationSunday = todayStr;
      showSundayCleaningNotification();
    }
  }
}

setInterval(checkSundaySchedule, 15 * 60 * 1000);
