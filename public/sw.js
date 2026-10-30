const CACHE_NAME = "moogold-shell-v3";
const OFFLINE_PAGE = "/offline.html";
const ROOT_PAGE = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_PAGE))
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("moogold-") && key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isCacheableStaticAsset(url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/favicon.ico"
  );
}

async function handleNavigation(request) {
  const url = new URL(request.url);

  try {
    const response = await fetch(request);

    // Cache only the successful public root page.
    // Do not cache redirects, login pages, or private dashboard pages.
    if (
      url.pathname === "/" &&
      response.ok &&
      response.type === "basic" &&
      new URL(response.url).origin === self.location.origin &&
      new URL(response.url).pathname === "/" &&
      (response.headers.get("content-type") || "").includes("text/html")
    ) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(ROOT_PAGE, response.clone());
    }

    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);

    if (url.pathname === "/") {
      const cachedHome = await cache.match(ROOT_PAGE);

      if (cachedHome) {
        return cachedHome;
      }
    }

    return (
      (await cache.match(OFFLINE_PAGE)) ||
      new Response(
        "MooGold is offline. Please reconnect to the internet and try again.",
        {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }
      )
    );
  }
}

async function handleAsset(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      new Response("", { status: 503, statusText: "Offline" })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  const url = new URL(request.url);

  if (isCacheableStaticAsset(url)) {
    event.respondWith(handleAsset(request));
  }
});