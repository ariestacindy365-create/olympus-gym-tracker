self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Deliberately does no caching — every page here is session/data-driven,
// so a passthrough fetch handler (just enough to satisfy PWA
// installability) is safer than risking stale data from a real cache.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
