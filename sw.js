// Ledger service worker
// - Caches the app shell so it works offline / installs as a PWA
// - Also handles the "SHOW_NOTIFICATION" message the app posts for its
//   news-event alarms, so alarms keep working even if this SW ends up
//   controlling the page instead of the app's own internal one.

const CACHE_NAME = "ledger-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./LedgerApp.jsx",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return res;
          })
          .catch(() => cached)
    )
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, event.data.options);
  }
});
