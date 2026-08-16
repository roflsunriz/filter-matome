# NicoCache_nl cache/info/v3

## エンドポイント

```text
GET  https://www.nicovideo.jp/cache/info/v3?<動画ID>
POST https://www.nicovideo.jp/cache/info/v3
```

2026-08-16時点の正本は、`%LOCALAPPDATA%\NicoCache_nl\src\dareka\processor\impl\CacheDirProcessor.java` と同ディレクトリの `CmafCacheInfo.java` である。

v3はCMAF/Domand由来のHLSキャッシュだけを返す。v2が含んでいたSmile、FLV、MP4、旧DMC優先フィールドはv3の対象外である。GETのクエリとPOST本文は、カンマまたは空白区切りで複数IDを指定できる。空入力は空のJSONオブジェクトを返し、無効なID形式はHTTP 400を返す。

## レスポンス契約

```ts
export type CacheInfoResponse = Record<string, CacheInfoEntry>;

export interface CacheInfoEntry {
  videoId: string | null;
  preferred: string | null;
  cacheIds: string[];
  cachings: string[];
  completes: string[];
  caches: Record<string, CacheInfoItem>;
}

export interface CacheInfoItem {
  videoId: string;
  cacheId: string;
  complete: boolean;
  caching: boolean;
  videoMode: string | null;
  audioBitrate: number;
  legacyLow: boolean;
  size: number;
  cachingSize?: number;
  title: string | null;
  subFolder: string | null;
  filename: string | null;
  ts: number | null;
}
```

ルートキーには要求に使ったIDが入り、`videoId`にはNicoCache_nlが正規化した動画IDが入る。対象動画にCMAF/Domand HLSキャッシュがない場合も、値は`null`ではなく、`preferred: null`、空配列、空の`caches`を持つエントリになる。

`preferred`は、完成済みキャッシュが存在する場合にNicoCache_nlが選んだHLS cacheIdである。`cacheIds`は登録済み、`cachings`は取得中、`completes`は完成済みの索引で、実体状態は`caches[cacheId].complete`と`caching`に入る。

## キャッシュ実体

- `videoMode`: `720p`などの映像品質。取得できない場合は`null`。
- `audioBitrate`: 音声ビットレート。
- `legacyLow`: 旧low相当のキャッシュかを示す互換情報。
- `size`: 完成済みでは実ファイルサイズ、未完成では予定サイズ。
- `cachingSize`: 未完成キャッシュで現在までに取得したサイズ。完成済みでは省略される。
- `title`、`subFolder`、`filename`、`ts`: 完成済みキャッシュでは実ファイル由来。未完成で一時ファイルを特定できない場合は`null`になる。

## 利用時の規則

- ローカル再生可否は`caches`内の`complete`を正とし、配列の件数だけで判断しない。
- 再生候補は完成済みの`preferred`を最優先にし、その後に完成済みcacheIdだけを重複なく調べる。取得中・未完了のcacheIdは再生候補にしない。
- `preferredDmc*`、`dmcMovieType`、`economy`、`dmc`、`movieType`、`reEncoded*`はv3に存在しないため参照しない。
- 外部入力は`unknown`として受け、必須フィールドとnullableフィールドを検証してから利用する。
