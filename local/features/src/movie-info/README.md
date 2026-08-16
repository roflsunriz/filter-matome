# movie-info

## 役割

一つの動画IDについて、NicoCache_nlとニコニコ動画の複数情報源を並べて確認する調査用ダッシュボードです。

- 配信URL: `https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html`
- HTML生成元: `index.html`
- 起動関数: `startMovieInfo()`

## 情報源

- `/cache/info/v3?<動画ID>`: NicoCache_nlのCMAF/Domand HLSキャッシュ情報。
- `common/video-info-api.ts`: 旧`ext.nicovideo.jp/api/getthumbinfo/<動画ID>` XMLと現行Watch API JSONを互換処理し、動画情報を共通形式へ正規化するクライアント。
- `/cache/gpac?<動画ID>`: ローカル動画をGPACで解析したJSON。HLS/CMAFは最高帯域の品質を選び、セグメント単位ではなく映像・音声のPID仕様をまとめて返す。
- `window.commonHelper.fetchWatchPage`: ウォッチページの `apiData`。
- `window.commonHelper.fetchNicoDataWithComments`: ユーザー操作時だけ取得するコメント統合データ。

基本4ソースは並列取得し、一部が失敗しても成功したデータを残します。コメントは件数と処理コストが大きいため自動取得せず、`bypassCommentFilter: true` でフィルター前の元データを要求します。

## 構成

- `index.html`: `data-feature-page="movie-info"` を持つ静的ページ。
- `index.ts`: 動画ID入力、取得状態、概要、エラー、コメント任意取得の統括。
- `api-clients.ts`: 基本4ソースとコメント取得のAPI境界。
- `ui.ts`: パネル、Raw JSON、コピー、ダウンロードの表示制御。
- `gpac-summary.ts`: GPACのコンテナ情報、解析条件、全ストリームの主要仕様と全属性表の表示。
- `description-html.ts`: 動画説明HTMLのサニタイズと安全なリンク化。
- `styles.ts`: ダッシュボードのレスポンシブスタイル。
- `header-adjustments.ts`: 共通ヘッダーと本文の配置調整。
- 専用型: `src/types/movie-info-types.ts`。

## 操作フロー

1. URL、動画ID、`videoId` クエリ、または共通ヘルパーから対象IDを決める。
2. `common/video-navigation.ts` の入力・キャッシュ検索から動画を選ぶ。
3. 基本4ソースを並列取得し、概要と各ソースの状態を更新する。
4. GPACパネルで再生時間、解像度、ビットレート、フレーム、色、音声、コンテナ情報とGPAC属性を確認する。
5. 必要な場合だけコメントを取得し、プレビューと完全JSONの操作を有効にする。
6. 選択中データをコピーまたはファイルへ保存する。

## 変更時の確認

- `/cache/*` のレスポンスやエラー形式を変更するときは、NicoCache_nl本体と `api-info/` を確認する。
- 取得失敗を握りつぶさず、情報源名、原因、次の確認方法を表示する。
- 動画説明は許可要素・属性を限定し、外部リンクへ `noopener noreferrer` を付ける。
- 大量コメントを概要DOMへ直接展開せず、プレビュー件数を制限する。
- ファイル名へ使う動画IDや情報源名をサニタイズする。

## テスト

`tests/movie-info.spec.ts` が動画入力、キャッシュ検索、基本4ソース、部分失敗、コメント任意取得、JSON表示、コピー、ダウンロード、狭幅表示を検証します。

```powershell
cd local/features
bunx playwright test tests/movie-info.spec.ts
bun run type-check
bun run build
```
