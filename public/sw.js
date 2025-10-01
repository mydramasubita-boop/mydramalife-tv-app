// Aggiungi un Service Worker di base per la cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('install', function(event) {
  console.log('[Service Worker] Install');
});
