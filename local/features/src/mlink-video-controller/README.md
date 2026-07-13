# mlink-video-controller

## 役割

ニコニコ動画の対象ページへ `<mlink-video-controller>` を挿入し、再生、音量、速度、コメント、関連リンク、設定を一つのパネルから操作します。ページ固有機能はモジュールとして登録し、設定に応じて読み込み・破棄します。

`startMlinkVideoController()` は `src/features.ts` から対象のニコニコ動画サブドメインとスタンドアロンvideo-playerで起動されます。SPA遷移時にも対象ページと動画IDを再判定します。

## 構成

- `index.ts`: 対象ページ検出、パネル配置、SPA遷移監視、初期化の入口。
- `panels/`: Web Component本体とパネルの基底実装。
- `tab-controllers/`: リンク、再生、音量、速度、コメント各タブのDOM操作。
- `handlers/`: タブ操作をプレイヤーやmylist2へ接続する処理。
- `managers/`: コメント、ヒートマップ、プレイヤー制御などの状態管理。
- `services/`: 動画プレイヤー抽象化と外部・ローカルリンク定義。
- `module-handlers/`: モジュール登録、依存解決、読み込み、設定保存・正規化、設定UI。
- `modules/`: ページ固有の独立機能。
- `templates/`, `styles/`: タブ別のHTMLとスタイル。
- `utils/`: ページ判定、動画ID、時刻、DOM、コメントJSON出力。

## モジュールシステム

`ModuleRegistry` が次の現行モジュールを登録し、`ModuleManager` が対象ページ、依存関係、排他グループ、設定状態に基づいて制御します。

- `header_privacy`
- `daily_lottery_highlight`
- `watch_page`
- `watch_background_selector`
- `watch_matrix_background`
- `watch_harajuku`
- `watch_tab_sessions`
- `thumbnails_filter`
- `heatmap`

新しいモジュールは `ModuleConfig` と `ModuleInstance` の契約を実装し、`module-registry.ts` へ登録してください。IDは永続設定のキーになるため、変更時は `settings-normalizer.ts` に明示的な移行を追加します。

## 設定とデータ

- モジュール有効状態・設定: `localStorage` の `nicoVideoController_moduleSettings`。
- 旧モジュールIDと未知のID: `settings-normalizer.ts` で正規化し、未知の設定をそのまま実行しない。
- 背景画像: `background-image-settings.ts` がIndexedDB、永続化要求、移行、バックアップ・復旧を管理する。
- ヒートマップ、ヘッダープライバシー、原宿風表示などには個別のlocalStorage設定がある。

保存形式を変更するときは、設定UI、インポート・エクスポート、正規化、初期値、テストを同時に更新してください。

## 主な連携境界

- `services/nico-video-player.ts`: 対象ページの動画要素と再生状態を優先して操作する。
- `handlers/mylist2.ts`: mylist2 SPAへ動画追加要求を渡す。
- `managers/comment-api-cache.ts`: コメントAPIデータを共有する。
- `common/cache-removal.ts`: HLSキャッシュの削除・削除予約を行う。
- `integrations/video-player-bridge.ts` はcomment-filter2側にあり、スタンドアロンプレイヤーへフィルター済みコメントを渡す。

`window.NicoCache_nl.watch` は存在・型・失敗を確認したフォールバックに限定し、現在の動画IDはURL、再生状態は対象ページのメディア要素を優先します。

## 変更時の確認

- パネル操作を追加するときは、template、controller、handler、styleの責務を分離する。
- Web Componentの再接続やSPA遷移でイベントリスナー、Observer、タイマーを重複させない。
- ニコニコ動画のDOMセレクター変更は実ページで確認し、翻訳文やハッシュ付きクラス名へ依存させない。
- 背景・原宿風・マトリックス背景の積層順とCSS変数を同時に確認する。
- 外部リンクやキャッシュ削除は、対象動画IDを検証してから実行する。

## テスト

- `tests/mlink-video-controller.spec.ts`: パネル、全タブ、モジュール設定、インポート・正規化、主要UI。
- `tests/mlink-video-controller.test.ts`: ディレクトリと責務の構造契約。
- `tests/mlink-video-controller-mylist2.test.ts`: mylist2へのSPA遷移。
- `tests/mlink-video-controller-cache-remove.test.ts`: キャッシュ削除API。

```powershell
cd local/features
bun run test:unit
bunx playwright test tests/mlink-video-controller.spec.ts
bun run type-check
bun run build
```

タブセッションの設計背景は `tab-sessions-module-concepts.md` を参照してください。
