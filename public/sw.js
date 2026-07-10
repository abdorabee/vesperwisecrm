// Minimal service worker for PWA installability and an offline fallback.
// Deliberately does NOT cache app pages or API responses: all CRM data is
// authenticated and must stay fresh, so every request goes to the network.
const OFFLINE_URL = "/offline";
const CACHE_NAME = "vesperwise-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.match(OFFLINE_URL))
        .then((cached) => cached ?? Response.error()),
    ),
  );
});
