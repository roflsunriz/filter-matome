# 1) 最小構造（TypeScript 型）

```ts
/** ルート：videoId をキーにした辞書 */
export type CacheIndex = Record<string, CacheEntry>;

/** エントリ：1つの動画に紐づくキャッシュ集合 */
export interface CacheEntry {
  preferred: string | null;          // 例: "sm29670413[360p,64].hls"
  preferredHTML5?: string | null;    // HTML5推奨（実質HLSと同義運用も）
  preferredFlash?: string | null;    // 旧Flash系（互換用）
  preferredSmile?: string | null;    // 旧smile動画（互換用）
  preferredDmc?: string | null;      // DMC優先（汎用）
  preferredDmcFlv?: string | null;   // DMCのFLV表記（実体はHLSもあり）
  preferredDmcHls?: string | null;   // DMCのHLS表記

  cacheIds: string[];                // 登録済みのcacheId一覧
  cachings: string[];                // ダウンロード中のcacheId（進行中）
  completes: string[];               // 完了済みのcacheId

  caches: Record<string, CacheItem>; // cacheId -> 実体
  reEncoded?: string | null;         // 再エンコード済みファイルID/パス等（なければnull）
  reEncodedBitrate?: number;         // kbps 等（仕様次第）
}

/** キャッシュ実体：1ビットレート/1フォーマット */
export interface CacheItem {
  videoId: string;                 // "sm29670413"
  cacheId: string;                 // "sm29670413[360p,64].hls"
  complete: boolean;               // 完了フラグ
  economy: boolean;                // 低画質(節約)扱いか
  dmc: boolean;                    // DMC配信由来か
  dmcMovieType?: DmcMovieType;     // 画質/音質メタ
  caching: boolean;                // 取得中フラグ
  movieType: 'hls' | 'flv' | string; // 実体の配信形式
  size: number;                    // バイト
  title: string;                   // タイトル（ファイル名生成に使用）
  subFolder?: string;              // サブフォルダ（空文字あり）
  filename: string;                // 実ファイル名（拡張子含む）
  ts: number;                      // 取得時刻（epoch秒想定）
  // 余剰/将来互換フィールドを素通し
  [k: string]: unknown;
}

export interface DmcMovieType {
  videoMode: string;   // 例: "360p"
  videoBitrate: number;// 未設定時は 0 のことも
  audioBitrate: number;// kbps（例: 64）
}
```

---

# 2) 最小JSONサンプル（プレースホルダ）

```json
{
  "smXXXXXXXX": {
    "preferred": "smXXXXXXXX[360p,64].hls",
    "preferredHTML5": null,
    "preferredFlash": null,
    "preferredSmile": null,
    "preferredDmc": "smXXXXXXXX[360p,64].hls",
    "preferredDmcFlv": "smXXXXXXXX[360p,64].hls",
    "preferredDmcHls": "smXXXXXXXX[360p,64].hls",
    "cacheIds": ["smXXXXXXXX[360p,64].hls"],
    "cachings": [],
    "completes": ["smXXXXXXXX[360p,64].hls"],
    "caches": {
      "smXXXXXXXX[360p,64].hls": {
        "videoId": "smXXXXXXXX",
        "cacheId": "smXXXXXXXX[360p,64].hls",
        "complete": true,
        "economy": false,
        "dmc": true,
        "dmcMovieType": { "videoMode": "360p", "videoBitrate": 0, "audioBitrate": 64 },
        "caching": false,
        "movieType": "hls",
        "size": 10112169,
        "title": "Video Title",
        "subFolder": "",
        "filename": "smXXXXXXXX[360p,64]_Video Title.hls",
        "ts": 1757335966
      }
    },
    "reEncoded": null,
    "reEncodedBitrate": 0
  }
}
```

---

# 3) 運用メモ（罠/正規化の指針）

* キー vs 中身

  * ルート辞書のキー（例: `"sm29670413"`）と `CacheItem.videoId` は**一致前提**。入力が壊れていたら正規化で補正/警告。

* 「preferred\*」の重複

  * `preferred / preferredDmc / preferredDmcHls / preferredDmcFlv / preferredHTML5 / preferredFlash` は**同じ cacheId を指すことが多い**。
    統一ポリシー例：`preferredDmcHls ?? preferred ?? first(completes) ?? first(cacheIds)`。

* 進行状態の二重管理

  * `CacheItem.complete/caching` と `completes/cachings` は**重複表現**。
    参照順：**実体(`CacheItem`)を真、配列は索引**として利用。

* 形式と拡張子

  * `movieType: "hls"` でも `filename` は `.hls` 拡張を付けているが、実ファイルは `.m3u8` や分割TS群の可能性あり。**実ファイル側の拡張規約を一元管理**。

* サイズと時刻

  * `size` は **バイト**とみなす。`ts` は **epoch秒**。UI表示時は**人間系に変換**（例: `2025-09-08T12:34:56+09:00`、`9.64 MB`）。

* 経済/economy

  * `economy=true` は「低画質取得」のシグナル。プレイヤ選択時の**除外/許容フラグ**に活用。

* DMCメタ

  * `dmcMovieType.videoBitrate=0` のような未設定値あり。**null相当扱い**にして「画質名(`videoMode`)を主」に。

* サブフォルダ

  * `subFolder: ""` は「未設定」。実際の保存先は別のルールで決まる場合があるので**空文字は未設定扱い**。

* 再エンコード

  * `reEncoded` が null でない場合は**派生ファイルの優先再生**が要件になることあり。`reEncodedBitrate` が品質指標。
