// Replaced by the build with a content hash of this worker and its public assets.
const BUILD_ID = "__BUILD_ID__";
const BASE = new URL(self.registration.scope);
const CACHE_PREFIX = `learning-table:${BASE.pathname}:`;
const CACHE_NAME = CACHE_PREFIX + BUILD_ID;
const FILES = [
  "index.html",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];
const ASSETS = FILES.map((file) => new URL(file, BASE).href);
const INDEX = new URL("index.html", BASE).href;
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          ASSETS.map((url) => new Request(url, { cache: "reload" })),
        ),
      ),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "APPLY_UPDATE") event.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE.origin) return;
  const isAppPage =
    url.pathname === BASE.pathname || url.pathname === new URL(INDEX).pathname;
  url.search = "";
  url.hash = "";
  const key = isAppPage ? INDEX : url.href;
  // Strict allowlist: never cache imported cards, unrelated routes or requests.
  if (!ASSETS.includes(key)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(key);
      if (saved) return saved;
      return fetch(event.request);
    })(),
  );
});
