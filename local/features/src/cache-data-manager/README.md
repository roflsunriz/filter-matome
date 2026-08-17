# cache-data-manager

## 役割

NicoCache_nlが生成するキャッシュ一覧ページを、検索・絞り込み・並び替え・仮想スクロール・詳細表示・キャッシュ操作に対応したUIへ構成します。

`src/features.ts` の起動時に `registerCacheDataManager()` が `window.makeCacheList` を登録し、NicoCache_nl側の変更できないHTMLから呼び出されると初期化します。

## 入出力境界

- 入力: NicoCache_nlがページへ展開する `window.tempList`、`window.cacheList`、`window.ncversion`。
- 動画詳細・公開状態: `common/video-info-api.ts` が現行Watch API JSONと旧`ext.nicovideo.jp/api/getthumbinfo/<動画ID>` XMLを互換処理する。
- キャッシュ削除: `common/cache-removal.ts` を通じてNicoCache_nl本体の動画単位DELETE APIを利用する。
- 出力: 一覧DOM、検索結果・詳細モーダル、再生・変換・削除操作。
- 補助保存: `storage/cache-metadata-db.ts` の `CacheDataManagerMetadata` IndexedDB。

`tempList` は同一動画の `cacheList` より優先されます。削除では動画に属するHLSだけを対象にし、MP4・FLV・SWFを保持したうえで、APIが返す即時削除・削除予約・対象なし・失敗を区別してください。

## 構成

- `main.ts`: グローバル入口と初期化。
- `loaders/`: NicoCache_nlのメモリデータを正規化・統合。
- `builders/`: 画面構築と一括操作。
- `components/`: 検索結果、フィルター・ソート、画像遅延読み込み。
- `managers/`: フィルター、ソート、イベント、進捗の状態管理。
- `engines/`: 検索処理。
- `renderers/`: 固定行高を前提とする仮想スクロール。
- `coordinators/`: カード操作とAPI結果を結ぶイベント処理。
- `clients/`: 共通動画情報APIとメモリキャッシュ。
- `storage/`: 補助メタデータ用IndexedDB。
- `templates/`, `styles/`: HTML断片と画面スタイル。

## 主な処理フロー

1. `window.makeCacheList()` が呼ばれる。
2. `LoadDataFromMemory` が `tempList` と `cacheList` を動画ID単位で統合する。
3. `UIBuilder` がヘッダー、検索・フィルター領域、一覧を生成する。
4. `VirtualScrollRenderer` が現在の表示範囲だけを描画する。
5. 不足しているメタデータは遅延取得し、検索・詳細表示へ反映する。
6. `EventCoordinator` が再生、変換、詳細、個別削除を処理し、`UIBuilder` が一括操作を処理する。

## 変更時の確認

- カードの高さや行間を変える場合は、`virtual-scroll-renderer.ts` の行高計算も更新する。
- `VideoData` を変える場合は `src/types/cache-data-manager-types.ts`、正規化、検索、テンプレート、fixtureをまとめて更新する。
- NicoCache_nlのグローバルや削除APIを変える場合は、実装を確認し、MP4保持とダウンロード中HLSの削除予約を回帰させない。
- 外部画像が失敗した場合も `common/thumbnail-fallback.ts` のフォールバックを維持する。

## テスト

- `tests/cache-data-manager.spec.ts`: 本番UIをfixtureへ注入し、一覧、全フィルター・ソート、検索、モーダル、個別・一括操作を検証する。
- `tests/mlink-video-controller-cache-remove.test.ts`: 共通キャッシュ削除クライアントのレスポンス正規化を検証する。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/cache-data-manager.spec.ts
bun run type-check
bun run build
```
