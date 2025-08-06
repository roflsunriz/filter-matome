console.debug("Service Worker script loaded");
console.debug("Current location:", self.location.href);
const CACHE_NAME = "custom-mylist2-v1";
const CACHE_URLS = [
  "/local/features/dist/mylist2.css",
  "/local/features/dist/mylist2.es.js",
  "/local/features/dist/src/mylist2/index.html"
];
const CACHE_EXPIRATION = 24 * 60 * 60 * 1e3;
const THUMBNAIL_CACHE_EXPIRATION = 365 * 24 * 60 * 60 * 1e3;
const cacheMetadata = /* @__PURE__ */ new Map();
const THUMBNAIL_PATTERN = /nicovideo\.jp\/thumb\//;
self.addEventListener("install", (event) => {
  console.debug("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const timestamp = Date.now();
      CACHE_URLS.forEach((url) => {
        cacheMetadata.set(url, timestamp);
      });
      return cache.addAll(CACHE_URLS);
    }).catch((error) => {
      console.error("Cache installation failed:", error);
    })
  );
});
self.addEventListener("activate", (event) => {
  console.debug("Service Worker activating...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const now = Date.now();
        const keys = await cache.keys();
        const deletions = keys.map(async (request) => {
          const url = request.url;
          const timestamp = cacheMetadata.get(url) || 0;
          if (now - timestamp > CACHE_EXPIRATION) {
            cacheMetadata.delete(url);
            return cache.delete(request);
          }
          return Promise.resolve();
        });
        return Promise.all(deletions);
      } catch (error) {
        console.error("Cache cleanup failed:", error);
      }
    })
  );
});
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(async (response) => {
      const url = event.request.url;
      if (THUMBNAIL_PATTERN.test(url)) {
        if (response) {
          const timestamp = cacheMetadata.get(url) || 0;
          const now = Date.now();
          if (now - timestamp <= THUMBNAIL_CACHE_EXPIRATION) {
            return response;
          }
        }
        return fetch(event.request).then((response2) => {
          if (response2.ok) {
            const responseToCache = response2.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
              cacheMetadata.set(url, Date.now());
            });
          }
          return response2;
        }).catch((error) => {
          console.error("Cache save failed:", error);
          return new Response("", {
            status: 404,
            headers: { "Content-Type": "image/jpeg" }
          });
        });
      }
      if (response) {
        const timestamp = cacheMetadata.get(url) || 0;
        const now = Date.now();
        if (now - timestamp <= CACHE_EXPIRATION) {
          return response;
        } else {
          cacheMetadata.delete(url);
          await caches.open(CACHE_NAME).then((cache) => cache.delete(event.request));
        }
      }
      if (url.includes("ext.nicovideo.jp/api/getthumbinfo")) {
        return fetch(event.request).then((response2) => {
          const responseToCache = response2.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
            cacheMetadata.set(url, Date.now());
          });
          return response2;
        }).catch(() => {
          return new Response(
            "<error><description>オフライン：動画情報を取得できません</description></error>",
            { headers: { "Content-Type": "text/xml" } }
          );
        });
      }
      return fetch(event.request).then((response2) => {
        if (response2.ok) {
          const responseToCache = response2.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
            cacheMetadata.set(url, Date.now());
          });
        }
        return response2;
      });
    })
  );
});
//# sourceMappingURL=mylist2-service-worker.js.map
