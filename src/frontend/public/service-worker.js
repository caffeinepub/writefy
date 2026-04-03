// ============================================================
// Writefy Service Worker — Cache-first offline strategy
// Uses the native Cache API (no Workbox library needed).
// ============================================================

const CACHE_NAME = "writefy-v1";

// Core shell assets cached on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── Install: pre-cache shell ──────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        // Non-fatal: continue even if some assets fail
        console.warn("[SW] Pre-cache error:", err);
      });
    }),
  );
  // Take over immediately — don't wait for old SW to die
  self.skipWaiting();
});

// ── Activate: purge stale caches ─────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  // Claim all open clients so offline works immediately
  self.clients.claim();
});

// ── Fetch: cache-first with network fallback ─────────────────
self.addEventListener("fetch", (event) => {
  // Only intercept GET requests
  if (event.request.method !== "GET") return;

  // Skip cross-origin requests (CDNs, analytics, ICP)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Don't cache error responses or opaque responses
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Cache a clone; return the original
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });

          return response;
        })
        .catch(() => {
          // Offline fallback: serve the app shell
          return caches.match("/index.html");
        });
    }),
  );
});

// ── Background Notifications ──────────────────────────────────
// The app posts { type: 'SHOW_NOTIFICATION', title, body } messages
// here so notifications fire even when the page is hidden/backgrounded.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    const { title, body } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: "/assets/generated/icon-192.dim_192x192.png",
      badge: "/assets/generated/icon-192.dim_192x192.png",
      vibrate: [200, 100, 200],
    });
  }
});
