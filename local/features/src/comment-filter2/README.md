# comment-filter2 プロジェクトガイド

## プロジェクト概要

- ニコニコ動画のコメント API (`https://public.nvcomment.nicovideo.jp/v1/threads`) を横取りし、NG ルールや置換ルールを適用したデータを video_player に渡すブラウザ拡張モジュールです。
- ルールと設定は IndexedDB に保存され、Shadow DOM 上の専用 UI から編集・インポート・エクスポートが可能です。
- JSON 形式のルールを中心に運用しつつ、従来形式 (CSV/レガシー JSONL) の読み込み・変換機構も保持しています。
- 複数スレッドや大量コメントに対しても Web Worker とニコる統計を使った最適化で高速にフィルタリングします。

## ディレクトリ構成

```
comment-filter2/
├─ index.ts                              // エントリーポイント
├─ components/
│  └─ ui-manager.ts                      // UI とユーザー操作の統括
├─ filter/
│  ├─ comment-filter.ts                  // 旧 NGWord ルール実装 (互換用)
│  ├─ comment-filter-engine.ts           // 正規表現 & ユーザー ID ルール処理
│  ├─ comment-filter-worker.ts           // 上記の Web Worker
│  ├─ json-comment-filter.ts             // 現行 JSON ルール実装
│  ├─ json-comment-filter-engine.ts      // JSON ルール用エンジン
│  ├─ json-comment-filter-worker.ts      // JSON ルール用 Web Worker
│  ├─ rule-indexer.ts                    // 文字列パターン高速化 (Aho-Corasick)
│  └─ thread-nicoru-stats.ts             // ニコる条件判定のための統計
├─ integrations/
│  └─ video-player-bridge.ts             // video_player へのデータ供給
├─ proxy/
│  └─ data-interceptor.ts                // fetch/History API をフック
├─ storage/
│  └─ indexed-db.ts                      // IndexedDB 実装と移行ロジック
├─ styles/
│  └─ main.ts                            // Shadow DOM 向けスタイル
├─ templates/
│  └─ main-ui.ts                         // UI テンプレート
└─ utils/
   ├─ constants.ts                       // 定数・イベント名
   ├─ csv.ts                             // CSV 変換ユーティリティ
   ├─ filter-helper.ts                   // フィルタ適用ヘルパー
   ├─ filter-logger.ts                   // フィルタ結果ログ収集
   ├─ jsonl-parser.ts                    // JSONL/CSV 判定と変換
   ├─ legacy-converter.ts                // レガシー設定からの移行
   └─ sanitizer.ts                       // コマンド・正規表現のサニタイズ
```

## 主要フロー

### コメント取得とフィルタリング

1. `proxy/data-interceptor.ts` が `window.fetch` と History API を差し替え、コメント API 応答を捕捉します。
2. 元データと SMID を `window.CommentFilter2Data` (エイリアス `window.commentFilter2GlobalData`) に保存し、`cf2:data-updated`/`cf2:smid-changed` を発火します。
3. `index.ts` がこれらのイベントを監視し、`UIManager.applyFilter()` を呼び出してフィルタリングを実行します。
4. `utils/filter-helper.ts` 経由で IndexedDB から設定と JSON ルールを取得し、`filter/json-comment-filter.ts` が Web Worker 分散処理や nicoru 条件を考慮してコメントを加工します。
5. フィルタ済みデータは再びグローバルストアに書き戻され、video_player 連携や UI から参照できます。

### UI と設定フロー

- Ctrl+Shift+F もしくは `window.CommentFilter2Instance.toggleUI()` で Shadow DOM 内に UI を生成します。
- UI ではフォーム編集と JSON エディタを切り替えられ、`FilterStorage` を通じて即時保存されます。
- JSON/CSV のインポート時は `jsonl-parser.ts` と `legacy-converter.ts` が形式を自動判定し最新形式へ変換します。
- 設定変更後は再読込や即時フィルタリングを行い、必要に応じてログ (`FilterLogger`) を収集します。

### video_player 連携

- `integrations/video-player-bridge.ts` が DOM 監視とバックオフ制御で video_player の存在を検知。
- `notifyVideoPlayerWithDiffCheck()` で差分を確認しつつフィルタ済みデータを送信し、同期後は `hasSuccessfullyNotified` を立てて過剰通知を防ぎます。
- `forceSync()` は UI からの再同期要求や SMID 変更時に呼び出され、デバウンス処理で video_player への負荷を抑えます。

## コアモジュール解説

- `index.ts`: 初期化・キーボードショートカット設定・イベント購読・デバッグ用 API (`window.CommentFilter2Instance`) を提供。
- `proxy/data-interceptor.ts`: SMID 判定 (SPA 対応)、グローバルデータ初期化、`selectMainThread` によるメインスレッド選択、フィルタ済み `Response` の生成を担当。
  - `bypassCommentFilter` 由来の内部フラグ付きリクエストはフィルタ済み `Response` に差し替えず、movie-info やコメントJSON保存がフィルタ前データを取得できるようにする。
- `components/ui-manager.ts`: Shadow DOM UI の生成、設定/ルール CRUD、ファイル入出力、フィルタ実行、バックアップ操作を一元化。
- `filter/json-comment-filter.ts`: ルール前処理 (`prepareJsonRules`)、Web Worker 分散 (`json-comment-filter-worker.ts`)、nicoru 条件やコマンド制限の適用、フィルタログ記録を実装。
- `filter/comment-filter.ts`: 旧 NGWord 形式 (正規表現+ユーザー ID) の互換実装。UI のレガシーインポートや既存データ移行用に保持。
- `storage/indexed-db.ts`: バージョン 3 (JSON ルールストア) への移行、整合性チェック/修復、バックアップ・リストア、マイグレーション履歴取得などを実装。
- `storage/indexed-db.ts`: 初期化後に必須ストアとインデックスを検証し、作成失敗の残骸がある場合は読めるストアを `localStorage` の `comment-filter2-emergency-backup-*` に退避してから、一度だけDBを削除・再作成します。
- `utils/filter-logger.ts`: フィルタ結果をバッファリングし、`settings.logToCommentFilterLogger` が真のとき外部ロガーへ送信。
- `filter/rule-indexer.ts`: Aho-Corasick を用いたリテラルパターンの事前絞り込みで、正規表現評価回数を削減。
- `filter/thread-nicoru-stats.ts`: 各スレッドのニコる統計を算出し、`nicoru_cond` 付きルールの発火条件に利用。

## IndexedDB とデータ形式

- データベース名は `CommentFilter2DB`、実装クラス `FilterStorage` が実際にはバージョン `3` を使用します。
- 主なオブジェクトストア
  - `rules`: 旧 NGWord 形式 (互換用)
  - `settings`: キーバリュー形式の設定 (`debugMode`, `isEnabled`, `commandSettings`, `logToCommentFilterLogger` など)
  - `json_rules`: 現行 JSON ルール。`enabled`, `smid` インデックスを保持。
- `createFullBackup()` / `restoreFromBackup()` で全ストアをシリアライズし、UI からバックアップ可能です。
- マイグレーション関連 API
  - `checkDatabaseIntegrity()` / `repairDatabase()` / `optimizeDatabase()` によりルール構造の検証・自動修復・重複排除を実行。
  - `getMigrationHistory()` は過去のバージョンアップログを返却。

## フィルタリング機能の詳細

- ルール種別
  - 正規表現 (`pattern` + `flags`)
  - ユーザー ID (`userId`)
  - `action.type` は `hide` または `replace` または `unspecified` (フィルタ免除)。
- 対象 SMID 条件: `smid` が `['ALL']` または具体的な SMID 配列で指定可能。
- ニコる条件 (`nicoru_cond`): `op` (gte/lte/range など) と `mode` (include/exclude) をサポートし、スレッド統計から判定。`hide`/`replace` では `include` が「条件に合致したら対象」、`exclude` が「条件に合致したら除外」を表します。`action.type: "unspecified"` はフィルタ免除専用のため `mode` に関係なく条件に一致したコメントを後続の非表示/置換ルールから免除し、フォーム入力では `exclude` に固定します。
- コメントコマンド制御:
  - `commandSettings` によりフォーク別 (`owner`/`main`/`easy`) に許可・強制コマンドを設定。
  - `sanitizeCommentCommands()` と `enforceCommandSettings()` が未許可コマンドを除外し、指定コマンドを付与。
- パフォーマンス
  - `chunkThreads()` でコメントスレッドを分割し Web Worker に振り分け。
  - `SubstringMatcher` によるリテラル一致の事前判定で正規表現の実行数を削減。
  - ハードウェアスレッド数 (`navigator.hardwareConcurrency`) を参照して Worker 数を決定し、フォールバック時はメインスレッド実行に切り替え。
- デバッグ
  - `debugMode` 有効時は `window.logger.debug` で詳細ログを出力し、適用済みルール数などを可視化。
  - `FilterLogger` が `CF2FilterLogEntry` を蓄積し、UI から送信状態を確認可能。

## UI 機能

- Shadow DOM (`closed`) 上に HTML テンプレートとスタイルを注入し、本体ページと干渉しない独立 UI を構築。
- キーボードショートカット保護やフォーカス制御でニコニコ本体のショートカットと競合しないよう調整。
- 主な機能
  - ルール一覧・追加・削除・一括削除
  - JSON 直接編集 (フォーマット切替)
  - JSON / JSONL / CSV インポート & JSON エクスポート
  - バックアップ・リストア操作
  - フィルタ適用テスト (`applyFilters`)・ログ表示・設定リセット
- UI 生成は初回表示時のみ実行され、`destroy()` で Shadow DOM とスタイルをクリーンアップします。

## video_player との橋渡し

- `VideoPlayerBridge` は MutationObserver で `#video-element` を監視し、存在確認後に `notifyVideoPlayerWithDiffCheck()` で差分送信します。
- 連携状態は `getStatus()` (検出状況・最終同期時間・SMID など) で取得可能。
- バックオフとデバウンスにより API 再送を制御し、`forceSync()` や `startDataMonitoring()` が再同期サイクルを管理します。

## デバッグ / 開発 Tips

- グローバル API
  - `window.CommentFilter2Instance`: エントリインスタンスへの参照。
    - `getDebugInfo()` で初期化状態・SMID・video_player 連携状況・定数を確認。
    - `showUI()` / `hideUI()` / `toggleUI()` / `destroy()` などを呼び出し可能。
  - `window[Symbol.for('CommentFilter2GlobalData')]`: 旧実装互換のグローバルデータ。
- 主要イベント
  - `CommentFilter2Ready`: 中央ルーターによる初期化完了
  - `cf2:data-updated`: コメントデータ更新
  - `cf2:smid-changed`: SMID 変更検知
- ログの活用
  - `window.logger` (info/debug/warn/error) を経由して開発ツールから状況を確認。
  - `FilterLogger` バッファは `settings.logToCommentFilterLogger` が真のとき送信されるため、テスト時は設定値に注意。
- 互換層
  - レガシー NGWord ルールは `comment-filter.ts` 経由で引き続き適用可能ですが、UI は JSON 形式を正としています。
  - 旧形式からのインポートは `legacy-converter.ts` が JSON 形式へ変換した上で保存します。

`startCommentFilter2()`は`src/features.ts`から視聴ページとスタンドアロンプレイヤーでのみ呼び出されます。エントリーファイルを直接読み込んでも自動起動しません。

## 編集時の注意

- フィルタ処理のエントリ (`filter-helper.ts` → `JsonCommentFilter`) と UI (`ui-manager.ts`) は密接に連携しているため、片側を変更した際はもう一方の挙動も必ず確認してください。
- IndexedDB スキーマを変更する場合は `FilterStorage` のマイグレーション関数と README の該当記述を更新してください。
- video_player との通信仕様を変更する場合は `mlink-video-controller` 側との互換性も要確認です。
