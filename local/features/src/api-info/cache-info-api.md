# NicoCache_nl RESTキャッシュAPI

## エンドポイント

```text
GET  https://nicocachenl.test/api/v1/videos/<動画ID>/cache-entries
POST https://nicocachenl.test/api/v1/cache-entry-queries
```

単一動画は動画IDをパスセグメントとしてUTF-8パーセントエンコードする。一括照会はJSON本文を使い、最大256件まで指定できる。

```json
{
  "videoIds": ["sm9", "sm10"]
}
```

## 動画単位レスポンス

```json
{
  "videoId": "sm9",
  "preferred": "sm9[1080p,192].hls",
  "cacheIds": ["sm9[1080p,192].hls"],
  "cachings": [],
  "completes": ["sm9[1080p,192].hls"],
  "caches": {
    "sm9[1080p,192].hls": {
      "videoId": "sm9",
      "cacheId": "sm9[1080p,192].hls",
      "complete": true,
      "caching": false,
      "videoMode": "1080p",
      "audioBitrate": 192,
      "legacyLow": false,
      "size": 123456789,
      "title": "動画タイトル",
      "subFolder": "",
      "filename": "sm9[1080p,192]_動画タイトル.hls",
      "ts": 1786838400
    }
  }
}
```

一括照会では、各動画IDをキーとして同じ動画単位レスポンスを返す。キャッシュがない動画も`videoId`と空配列・空`caches`を持つ。現行CMAF/Domand HLSだけを対象とし、完成判定は`complete`または`completes`を使う。

## 関連API

```text
GET    /api/v1/cache-entries?query=<検索語>&order=desc
GET    /api/v1/videos/<動画ID>/media
GET    /api/v1/videos/<動画ID>/exports/video
GET    /api/v1/videos/<動画ID>/exports/audio
GET    /api/v1/videos/<動画ID>/exports/comments
DELETE /api/v1/videos/<動画ID>/temporary-cache-entries
DELETE /api/v1/videos/<動画ID>/hls-cache-entries
DELETE /api/v1/videos/<動画ID>/cache-entries
```

キャッシュ検索は通常、キャッシュIDをキーとする検索結果を直下へ返す。本体の移行途中などで
`query`が反映されず、`{"complete": {...}, "temporary": {...}}` の一覧形式が返る場合は、
共通検索クライアントが`complete`だけを同じ検索語で絞り込み、取得中キャッシュを結果へ混在させない。

旧`www.nicovideo.jp/cache/*`は配信経路を含めて利用しない。CMAFの内部配信は
`https://nicocachenl.test/media/v1/*`へ分離され、通常の利用側は動画単位の`/media`を使う。
