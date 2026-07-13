# watch-history

## 役割

ウォッチページとスタンドアロンvideo-playerの実際のメディア再生を追跡し、IndexedDBへ視聴履歴を保存します。専用SPAでは履歴検索、フィルター、統計、シリーズ、アラート、メモ、削除、入出力、DB管理を提供します。

- 配信URL: `https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html`
- HTML生成元: `index.html`
- SPA入口: `startWatchHistoryApp()`
- 追跡入口: `startWatchTracker()`

## 構成

- `watch-tracker.ts`: 動画ID・メタデータ取得、動画要素監視、進捗とセッション記録。
- `database.ts`: 履歴、統計、シリーズ、アラート、入出力、DB操作。
- `migration-manager.ts`: バージョン移行、永続化要求、バックアップ、設定。
- `app.ts`: SPA全体のUI、操作、通知、DB管理。
- `history-filter.ts`: 履歴の検索・絞り込みとお気に入り集計。
- `history-delete-rules.ts`: 条件付き削除の値取得、比較、説明生成。
- `series-filter.ts`: シリーズ一覧の絞り込み。
- `series-alert-extension-client.ts`: IndexedDBとNicoCache_nl常駐extensionのアラート設定・確認状態を同期。
- `tag-cloud-renderer.ts`, `video-detail-renderer.ts`: 表示専用処理。
- `styles.ts`: 共通テーマを使うレスポンシブスタイル。
- `requirements.md`: 追跡・履歴機能の補足要件。

## 追跡フロー

1. ウォッチページのパスまたはスタンドアロンページの `videoId` から動画IDを取得する。
2. `commonHelper.fetchWatchPage(videoId)` でメタデータを取得し、既存履歴を更新または新規作成する。
3. 対象の `HTMLVideoElement` を探し、`loadedmetadata`、`play`、`pause`、`ended`、`timeupdate` を監視する。
4. 再生位置、視聴秒数、完了率、繰り返し、視聴ログを一定間隔で保存する。
5. URL変更、ページ非表示、離脱時に状態を確定する。

動画IDはURL・呼び出し元を優先し、再生状態は実際の動画要素を正とします。ページのメタ情報だけで再生済みと判定しないでください。

## データと復旧

- DB名: `NicoWatchHistory`。
- `watchHistory`: 動画IDをキーにした履歴、統計、タグ、シリーズ、メモ、視聴ログ。
- `seriesAlerts`: シリーズ別アラートと次回確認状態。
- DBバージョン、インデックス、移行は `database.ts` と `migration-manager.ts` を正とする。

初期化後にスキーマを検証し、破損時はバックアップと再作成の方針に従います。型を任意化して旧データを放置せず、入出力形式を含めて明示的に移行してください。

## SPA機能

- タイトル・投稿者・タグ・メモ検索、日付・完了状態フィルター、複数ソート。
- 履歴、統計、シリーズ、シリーズアラートの各タブ。
- 動画詳細、メモ編集、個別削除、全削除、複数条件による削除。
- JSONインポート・エクスポート。
- 永続化要求、手動移行、バックアップ作成・復元、健全性確認。
- `FilterMatomeSeriesAlerts` extensionによる常駐シリーズ確認とOS通知。システム通知が使えない場合はNicoCache_nl GUIログと通知音へフォールバックする。

シリーズアラートタブを開くと、IndexedDBの設定とextensionが`data/filter-matome-series-alerts.json`へ保持する状態を`updatedAt`で統合します。定期確認と通知はextensionが担当するため、watch-historyページやブラウザを閉じてもNicoCache_nlが起動していれば動作します。

## 変更時の確認

- 追跡間隔や完了条件変更では、短時間再生、シーク、リピート、動画切替、ページ離脱を確認する。
- DB変更では移行、バックアップ、インポート、統計、シリーズ集計をまとめて更新する。
- 削除条件は表示ラベルと純粋関数を一致させ、実際の削除前に対象件数を提示する。
- extension未配置、NicoCache_nl停止、システム通知未対応を通常の分岐として扱い、UI状態・GUIログ・通知音で判断できるようにする。
- サムネイル失敗時は共通フォールバックを使う。

## テスト

- `tests/watch-history.spec.ts`: 実IndexedDBを使う全タブ、フィルター、統計、シリーズ、削除、入出力、DB管理、通知UI。
- `tests/watch-history-filter.test.ts`: 履歴フィルターと集計。
- `tests/watch-history-delete-modal.test.ts`: 条件付き削除ルール。
- `tests/watch-history-series-alert-extension.test.ts`: IndexedDBとextension状態の統合規則。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/watch-history.spec.ts
bun run type-check
bun run build
```
