/* global ServiceWorkerGlobalScope, ExtendableEvent, FetchEvent, Response */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// Service Worker環境チェック
console.debug("Service Worker script loaded");
console.debug("Current location:", self.location.href);

const CACHE_NAME = "custom-mylist2-v2";
const CACHE_URLS = [
  "/local/features/dist/features.js",
  "/local/features/dist/pages/mylist/index.html",
];

// 通常のキャッシュの有効期限（24時間）
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// サムネイル画像のキャッシュ有効期限（1年）
const THUMBNAIL_CACHE_EXPIRATION = 365 * 24 * 60 * 60 * 1000;

// キャッシュのメタデータを保存
const cacheMetadata = new Map<string, number>();

// サムネイル画像のパターンを追加
const THUMBNAIL_PATTERN = /nicovideo\.jp\/thumb\//;

// Service Workerのインストール
self.addEventListener("install", (event: ExtendableEvent) => {
  console.debug("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        // キャッシュ時にタイムスタンプを記録
        const timestamp = Date.now();
        CACHE_URLS.forEach((url) => {
          cacheMetadata.set(url, timestamp);
        });
        return cache.addAll(CACHE_URLS);
      })
      .catch((error) => {
        console.error("Cache installation failed:", error);
      }),
  );
});

// 定期的なキャッシュクリーンアップ
self.addEventListener("activate", (event: ExtendableEvent) => {
  console.debug("Service Worker activating...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // 古いキャッシュを削除
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
    }),
  );
});

// キャッシュの利用とフォールバック
self.addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(
    caches.match(event.request).then(async (response) => {
      const url = event.request.url;

      // サムネイル画像の場合の処理
      if (THUMBNAIL_PATTERN.test(url)) {
        if (response) {
          const timestamp = cacheMetadata.get(url) || 0;
          const now = Date.now();

          // サムネイル用の長い有効期限を使用
          if (now - timestamp <= THUMBNAIL_CACHE_EXPIRATION) {
            return response;
          }
        }

        return fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const responseToCache = response.clone();
              void caches.open(CACHE_NAME).then((cache) => {
                void cache.put(event.request, responseToCache);
                cacheMetadata.set(url, Date.now());
              });
            }
            return response;
          })
          .catch((error) => {
            console.error("Cache save failed:", error);
            // オフライン時のフォールバック画像を返す
            return new Response("", {
              status: 404,
              headers: { "Content-Type": "image/jpeg" },
            });
          });
      }

      // キャッシュが存在し、有効期限内かチェック
      if (response) {
        const timestamp = cacheMetadata.get(url) || 0;
        const now = Date.now();

        if (now - timestamp <= CACHE_EXPIRATION) {
          return response;
        } else {
          // 期限切れの場合、キャッシュを削除
          cacheMetadata.delete(url);
          await caches
            .open(CACHE_NAME)
            .then((cache) => cache.delete(event.request));
        }
      }

      // 動画情報のAPIリクエストの場合
      if (url.includes("ext.nicovideo.jp/api/getthumbinfo")) {
        return fetch(event.request)
          .then((response) => {
            // レスポンスをキャッシュに保存
            const responseToCache = response.clone();
            void caches.open(CACHE_NAME).then((cache) => {
              void cache.put(event.request, responseToCache);
              cacheMetadata.set(url, Date.now());
            });
            return response;
          })
          .catch(() => {
            return new Response(
              "<error><description>オフライン：動画情報を取得できません</description></error>",
              { headers: { "Content-Type": "text/xml" } },
            );
          });
      }

      // その他のリクエスト
      return fetch(event.request).then((response) => {
        // 成功したレスポンスのみキャッシュ
        if (response.ok) {
          const responseToCache = response.clone();
          void caches.open(CACHE_NAME).then((cache) => {
            void cache.put(event.request, responseToCache);
            cacheMetadata.set(url, Date.now());
          });
        }
        return response;
      });
    }),
  );
});

// TypeScriptのモジュールとしてexportを追加（必要に応じて）
export {};
