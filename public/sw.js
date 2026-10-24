// Service Worker para Minha Igreja Hub PWA
const CACHE_NAME = 'igreja-hub-v2';

const STATIC_PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon.svg',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Usar Promise.allSettled para garantir que mesmo com pequenas oscilações o SW instale
      await Promise.allSettled(
        STATIC_PRECACHE.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Pré-cache ignorou URL com aviso:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Apenas intercepta requisições HTTP(S) GET da mesma origem
  if (req.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  // Requisições de navegação (HTML): Network first, fallback para cache index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match('./index.html').then((cached) => {
          return cached || caches.match('./');
        });
      })
    );
    return;
  }

  // Recursos estáticos (scripts, css, imagens, fontes): Cache-first com fallback para network e atualização de cache
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(req).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, responseClone);
        });
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });
    })
  );
});

// Manipulador de clique em notificações push no celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickData = event.notification.data || {};
  const targetUrl = clickData.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se houver uma janela já aberta, foca nela e envia a aba destino
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (clickData.tab) {
            client.postMessage({ type: 'PUSH_NOTIFICATION_CLICK', tab: clickData.tab, data: clickData });
          }
          return client.focus();
        }
      }
      // Se nenhuma janela estiver aberta, abre uma nova
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Suporte para eventos Push
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Minha Igreja Hub',
    body: 'Você tem uma nova notificação no aplicativo.'
  };

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || './icon-192.png',
    badge: payload.badge || './icon-192.png',
    vibrate: [200, 100, 200],
    data: payload.data || { url: './' },
    tag: payload.tag || 'general-push',
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});
