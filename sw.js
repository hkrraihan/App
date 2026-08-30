const CACHE_NAME = "ledger-cache-v1";

// Relative paths so this works whether the app is hosted at the domain root
// or under a GitHub Pages project subpath (username.github.io/repo-name/).
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon.png", "./LedgerApp.jsx"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        // if a CDN asset can't be pre-cached that's fine, app shell files still get cached
      })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Serve from cache instantly if we have it, refresh in the background;
      // fall back to network (or nothing) if it's not cached yet.
      return cached || networkFetch;
    })
  );
});
