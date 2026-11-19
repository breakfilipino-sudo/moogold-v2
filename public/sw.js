const CACHE_NAME = "moogold-shell-v4";
const OFFLINE_PAGE = "/offline.html";
const ROOT_PAGE = "/";
const PWA_ROOT_PAGE = "/?source=pwa";

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {};

      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        payload = {
          title: "MooGold",
          message: event.data ? event.data.text() : "You have a new notification.",
        };
      }

      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
      ) {
        payload = {};
      }

      // Phone push is reserved exclusively for admin-approved promotions.
      if (payload.kind !== "PROMOTIONAL") {
        return;
      }

      const title =
        typeof payload.title === "string" && payload.title.trim()
          ? payload.title.slice(0, 120)
          : "MooGold";

      const body =
        typeof payload.message === "string"
          ? payload.message.slice(0, 500)
          : typeof payload.body === "string"
            ? payload.body.slice(0, 500)
            : "You have a new notification.";

      const requestedUrl =
        typeof payload.href === "string" ? payload.href : "/dashboard/notifications";

      let targetUrl = "/dashboard/notifications";

      try {
        const parsed = new URL(requestedUrl, self.location.origin);

        if (parsed.origin === self.location.origin) {
          targetUrl = parsed.pathname + parsed.search + parsed.hash;
        }
      } catch {
        // Keep the safe notifications-page fallback.
      }

      const kind = "PROMOTIONAL";

      await self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag:
          typeof payload.tag === "string"
            ? payload.tag.slice(0, 120)
            : `moogold-${kind.toLowerCase()}`,
        data: {
          url: targetUrl,
          kind,
        },
        renotify: false,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      let targetUrl = "/dashboard/notifications";

      try {
        const requestedUrl = event.notification.data?.url;

        if (typeof requestedUrl === "string") {
          const parsed = new URL(requestedUrl, self.location.origin);

          if (parsed.origin === self.location.origin) {
            targetUrl = parsed.href;
          }
        }
      } catch {
        // Keep the safe notifications-page fallback.
      }

      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) {
          continue;
        }

        if ("navigate" in client) {
          await client.navigate(targetUrl);
        }

        if ("focus" in client) {
          await client.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })()
  );
});
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
      const cacheKey = url.searchParams.get("source") === "pwa"
        ? PWA_ROOT_PAGE
        : ROOT_PAGE;
      await cache.put(cacheKey, response.clone());
    }

    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);

    if (url.pathname === "/") {
      const cacheKey = url.searchParams.get("source") === "pwa"
        ? PWA_ROOT_PAGE
        : ROOT_PAGE;
      const cachedHome = await cache.match(cacheKey);

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