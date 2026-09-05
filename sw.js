// Ledger service worker
// - Caches the app shell (this repo's own files) so the app opens offline.
// - Leaves CDN requests (esm.sh, fonts, tailwind) to the network as-is, so
//   you always get the pinned library versions rather than a stale cache.
// - Also understands the SHOW_NOTIFICATION message the app itself posts for
//   its news-event alarms, so it behaves the same as the temporary worker
//   the app registers internally.

const CACHE_NAME = "ledger-shell-v1";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./LedgerApp.jsx", "./icon.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // Non-fatal — e.g. a file listed above doesn't exist yet.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin GET requests for the app shell; let everything
  // else (CDN scripts, fonts, cross-origin data) go straight to the network.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, event.data.options);
  }
});
