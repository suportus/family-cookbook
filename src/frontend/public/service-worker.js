// Minimal service worker for PWA installability
// Logs install and activate events only, no caching logic

self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
  event.waitUntil(self.clients.claim());
});
