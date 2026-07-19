# comment-filter2

## 役割

ニコニコ動画のコメントAPI応答を捕捉し、保存済みルールで非表示・置換・コマンド制御を行って、公式ページまたはローカルvideo-playerへ渡します。設定UIはShadow DOMで表示し、ルールと設定はIndexedDBへ保存します。

`startCommentFilter2()` は `src/features.ts` からウォッチページとスタンドアロンプレイヤーで起動されます。直接importしただけでは自動起動しません。

## 構成

- `index.ts`: 初期化、ショートカット、イベント購読、`window.CommentFilter2Instance`。
- `proxy/data-interceptor.ts`: `fetch` と共通SPA遷移イベントを監視し、元コメント応答と動画IDを捕捉。
- `filter/`: 現行JSONルール、互換ルール、純粋なフィルターエンジン、Worker、Aho–Corasick候補索引、安全な必須トークン抽出、ニコる統計。
- `storage/indexed-db.ts`: `CommentFilter2DB` のスキーマ、マイグレーション、整合性検証、バックアップ・復旧。
- `components/ui-manager.ts`: 概要、ルール、コマンド、データ、設定のUIと操作。
- `integrations/video-player-bridge.ts`: フィルター済みコメントをvideo-playerへ同期する境界。
- `templates/`, `styles/`: Shadow DOM用テンプレートとスタイル。
- `utils/`: JSON/JSONL/CSV変換、旧形式移行、サニタイズ、正規表現診断、ログ。

## データフロー

1. `DataInterceptor` がコメントAPI応答を捕捉し、元データをグローバルストアへ保持する。
2. `cf2:data-updated` または `cf2:smid-changed` を受けて、UI管理層が保存済み設定とルールを読む。
3. JSONフィルターがスレッドごとにルールを適用する。大量データはWorkerへ分割し、失敗時はメインスレッドへフォールバックする。
4. フィルター済みデータをグローバルストアへ戻し、`VideoPlayerBridge` が差分を確認してvideo-playerへ通知する。

正規表現ルールはECMAScript ASTから全分岐に必ず含まれるリテラルを抽出し、コメント本文に候補があるルールだけを最終判定します。安全な候補を証明できないルール、インライン修飾子、Unicodeの大文字小文字同一視で曖昧になる部分は索引化せず、通常の`RegExp`評価へフォールバックします。

内部取得で `bypassCommentFilter` が指定された要求は置換しません。movie-infoやコメントJSON保存が元レスポンスを取得するための契約なので維持してください。

## 永続化と互換性

- DB名: `CommentFilter2DB`。
- 主なストア: 互換ルールの `rules`、設定の `settings`、現行JSONルールの `json_rules`。
- 現行ルールはJSON形式を正とし、旧NGWord、CSV、JSONLはインポート・移行境界として扱う。
- コマンド適用方式は既定で同カテゴリー置換とし、全除去モードは明示的に有効化する。設定項目がない既存DBは同カテゴリー置換へ移行する。
- スキーマの実バージョンと移行処理は `FilterStorage` を正とする。
- 初期化失敗やスキーマ不整合時は、読めるデータを緊急バックアップしてから一度だけ再作成を試みる。

## 公開境界

- `window.CommentFilter2Instance`: UI表示、再適用、診断用の実行時インスタンス。
- `CommentFilter2Ready`: 初期化完了。
- `cf2:data-updated`: コメントデータ更新。
- `cf2:smid-changed`: 対象動画IDの変更。
- `commentFilter2Update`: video-playerへ送る更新イベント。

イベント名やデータ型を変更するときは `src/types/video-player-bridge-types.ts` とvideo-player側の受信処理を同時に更新してください。

## 変更時の確認

- ルール仕様変更では、純粋エンジン、Worker、メインスレッドの結果を一致させる。
- 正規表現や置換文字列は `sanitizer.ts` と `regex-analyzer.ts` を通し、危険な入力や過大な計算量を考慮する。
- IndexedDB変更では既存データの強制マイグレーション、バックアップ、破損復旧を更新する。
- UI変更では低い画面の内部スクロール、フォーカス、公式プレイヤーのショートカットとの競合を確認する。

## テスト

- `tests/comment-filter2.spec.ts`: UI、実IndexedDB、ルールCRUD、即時適用、正規表現プレビュー。
- `tests/comment-filter2-command-settings.test.ts`: 既存コマンドの同カテゴリー置換と全除去を、JSON・互換両エンジンで比較する。
- `tests/comment-filter2-required-token-index.test.ts`: 必須トークン抽出、候補索引なしとの結果同値性、Unicode境界、正規表現評価回数。
- `tests/comment-filter2-nicoru-exclusion.test.ts`: ニコる条件と免除ルール。
- `tests/comment-data-bypass.test.ts`: フィルターを迂回する内部取得契約。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/comment-filter2.spec.ts
bun run type-check
bun run build
```
