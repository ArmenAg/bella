/* global caches, fetch, self, Response, URL */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `bella-static-${CACHE_VERSION}`;
const OFFLINE_CACHE = `bella-offline-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const ROLLBACK_UNREGISTER = false;

const STATIC_ASSETS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

const STATIC_PATH_PREFIXES = ["/_next/static/"];
const STATIC_PATHS = new Set(STATIC_ASSETS);

async function clearBellaCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith("bella-"))
      .map((cacheName) => caches.delete(cacheName)),
  );
}

function isStaticAsset(url) {
  return (
    STATIC_PATHS.has(url.pathname) ||
    STATIC_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  );
}

function shouldBypassCache(url) {
  if (url.origin !== self.location.origin) return true;

  const path = url.pathname;
  const privateOrAuthPath =
    path === "/login" ||
    path.startsWith("/login/") ||
    path.startsWith("/auth") ||
    path.startsWith("/api/") ||
    path.startsWith("/_next/data/") ||
    path.startsWith("/_actions") ||
    path.startsWith("/storage/") ||
    path.startsWith("/uploads/") ||
    path.includes("/signed/") ||
    path.includes("/private/");

  const signedOrSensitiveQuery =
    url.searchParams.has("token") ||
    url.searchParams.has("signature") ||
    url.searchParams.has("X-Amz-Signature") ||
    url.searchParams.has("expires") ||
    url.searchParams.has("signed");

  return privateOrAuthPath || signedOrSensitiveQuery;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC_CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const offline = await caches.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

self.addEventListener("install", (event) => {
  if (ROLLBACK_UNREGISTER) {
    event.waitUntil(self.skipWaiting());
    return;
  }

  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  if (ROLLBACK_UNREGISTER) {
    event.waitUntil(
      clearBellaCaches()
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll({ type: "window" }))
        .then((clients) =>
          Promise.all(clients.map((client) => client.navigate(client.url))),
        ),
    );
    return;
  }

  const expectedCaches = new Set([STATIC_CACHE, OFFLINE_CACHE]);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("bella-"))
            .filter((cacheName) => !expectedCaches.has(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "BELLA_SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data?.type === "BELLA_UNREGISTER") {
    event.waitUntil(
      clearBellaCaches().then(() => self.registration.unregister()),
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (ROLLBACK_UNREGISTER) return;

  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (shouldBypassCache(url)) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  }
});
