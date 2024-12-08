const CACHE_NAME = 'custom-mylist2-v1';
const CACHE_URLS = [
    '../html/manager.html',
    '../css/style.css',
    '../js/manager.js',
    '../lib/database.js',
    '../lib/mylist-manager.js'
];

// キャッシュの有効期限（24時間）
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// キャッシュのメタデータを保存
const cacheMetadata = new Map();

// Service Workerのインストール
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // キャッシュ時にタイムスタンプを記録
                const timestamp = Date.now();
                CACHE_URLS.forEach(url => {
                    cacheMetadata.set(url, timestamp);
                });
                return cache.addAll(CACHE_URLS);
            })
    );
});

// 定期的なキャッシュクリーンアップ
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            // 古いキャッシュを削除
            const now = Date.now();
            const keys = await cache.keys();
            const deletions = keys.map(async request => {
                const url = request.url;
                const timestamp = cacheMetadata.get(url) || 0;
                
                if (now - timestamp > CACHE_EXPIRATION) {
                    cacheMetadata.delete(url);
                    return cache.delete(request);
                }
            });
            
            return Promise.all(deletions);
        })
    );
});

// キャッシュの利用とフォールバック
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(async response => {
            const url = event.request.url;
            
            // キャッシュが存在し、有効期限内かチェック
            if (response) {
                const timestamp = cacheMetadata.get(url) || 0;
                const now = Date.now();
                
                if (now - timestamp <= CACHE_EXPIRATION) {
                    return response;
                } else {
                    // 期限切れの場合、キャッシュを削除
                    cacheMetadata.delete(url);
                    await caches.open(CACHE_NAME).then(cache => cache.delete(event.request));
                }
            }

            // 動画情報のAPIリクエストの場合
            if (url.includes('ext.nicovideo.jp/api/getthumbinfo')) {
                return fetch(event.request)
                    .then(response => {
                        // レスポンスをキャッシュに保存
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                            cacheMetadata.set(url, Date.now());
                        });
                        return response;
                    })
                    .catch(() => {
                        return new Response(
                            '<error><description>オフライン：動画情報を取得できません</description></error>',
                            { headers: { 'Content-Type': 'text/xml' } }
                        );
                    });
            }

            // その他のリクエスト
            return fetch(event.request).then(response => {
                // 成功したレスポンスのみキャッシュ
                if (response.ok) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                        cacheMetadata.set(url, Date.now());
                    });
                }
                return response;
            });
        })
    );
}); 