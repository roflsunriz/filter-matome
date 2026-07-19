# features 開発ガイド

## 概要

`local/features/` は、NicoCache_nlからニコニコ動画へ配信するブラウザー機能をBunとTypeScriptで管理するワークスペースです。すべての機能は `src/features.ts` を入口とする `dist/features.js` にまとめられ、`nlFilters/100_features.txt` から読み込まれます。

個別バンドルはありません。変更したプロジェクトにかかわらず、全体ビルドと関連テストを実行してください。

## ディレクトリ構成

```text
local/features/
├── src/                 # TypeScriptソースと静的HTML
├── tests/               # Bun単体テスト、Playwrightテスト、fixture
├── scripts/             # 一括ビルドと単体テストの実行スクリプト
├── dist/                # 生成物。Git管理外
├── package.json         # コマンドと依存関係
├── bun.lock             # 依存関係の固定状態
├── playwright.config.ts # E2E設定
└── tsconfig.json        # TypeScript設定とパスエイリアス
```

## プロジェクト一覧

| ディレクトリ | 責務 | 詳細 |
| --- | --- | --- |
| `src/api-info/` | NicoCache_nl・ニコニコ動画関連APIの調査メモ | [README](src/api-info/README.md) |
| `src/cache-data-manager/` | NicoCache_nlキャッシュ一覧の検索・操作UI | [README](src/cache-data-manager/README.md) |
| `src/comment-filter2/` | コメントAPIの捕捉、ルール適用、設定UI | [README](src/comment-filter2/README.md) |
| `src/common/` | 共通ヘッダー、ログ、通知、アイコン、API・UI部品 | [README](src/common/README.md) |
| `src/mlink-video-controller/` | 視聴ページの操作パネルと機能モジュール | [README](src/mlink-video-controller/README.md) |
| `src/movie-info/` | 動画・キャッシュ・API情報ダッシュボード | [README](src/movie-info/README.md) |
| `src/mylist2/` | 独自マイリストの管理SPA | [README](src/mylist2/README.md) |
| `src/runtime/` | 配信ページ判定と起動境界 | [README](src/runtime/README.md) |
| `src/sandbox/` | 外部配布物を隔離したAPI調査。ダウンロード物はビルド・Git管理外 | [README](src/sandbox/README.md) |
| `src/types/` | グローバル型と機能横断の型定義 | [README](src/types/README.md) |
| `src/video-player/` | ウォッチページ連携とローカル動画プレイヤー | [README](src/video-player/README.md) |
| `src/watch-history/` | 視聴追跡と履歴管理SPA | [README](src/watch-history/README.md) |

## 起動と配信

`src/features.ts` は一度だけ起動し、`runtime/page-context.ts` の判定結果に応じて機能を初期化します。

- 生成HTMLの `data-feature-page`: mylist2、movie-info、video-player、watch-historyの各SPAを起動する。
- NicoCache_nlの対象ページ: `common` を起動し、対象ホストでは `mlink-video-controller` を起動する。
- `www.nicovideo.jp/watch/<動画ID>`: comment-filter2、video-playerのルーター、watch-historyの追跡処理を起動する。
- cache-data-manager: NicoCache_nlが生成するHTMLから呼ばれる `window.makeCacheList` を登録する。

SPA遷移は `MutationObserver` と `popstate` でも再判定します。ページ判定を変更すると複数機能の起動条件へ波及するため、`runtime/` と `features.ts` を併せて確認してください。

## セットアップと検証

要求するBunのバージョンは `package.json` の `packageManager` を正とします。

```powershell
cd local/features
bun install
bun run format
bun run lint
bun run type-check
bun run test
bun run build
```

- `bun run test:unit`: Bun単体テストのみ。
- `bun run test`: 単体テストと `package.json` で列挙したPlaywrightテスト。
- `bun run build`: 全ブラウザー機能、Worker、Service Worker、静的HTMLを一括生成。
- `bun run error-check`: 型チェックとlintの短縮コマンド。

`bun run format` は `src/**/*.ts` を書き換えます。実行後は差分を確認してください。テスト方針とfixtureの扱いは [tests/README.md](tests/README.md) を参照してください。

## ビルド成果物

`scripts/build.ts` は最初に `dist/` を削除し、次を生成して出力契約を検証します。

```text
dist/
├── features.js
├── features.js.map
├── workers/
│   ├── comment-filter-worker.js
│   └── json-comment-filter-worker.js
├── mylist-service-worker.js
└── pages/
    ├── movie-info/index.html
    ├── mylist2/index.html
    ├── video-player/index.html
    └── watch-history/index.html
```

`dist/` と `test-results/` はGit管理外の生成物です。手編集やコミットをせず、生成元を変更して再生成してください。

## 編集時の原則

- 対象プロジェクトのREADMEとテストを先に確認する。
- `common/`、`types/`、`runtime/`、`features.ts` の変更時は、利用元を検索して複数プロジェクトの回帰を確認する。
- IndexedDBやlocalStorageの形式を変更するときは、バージョン検証、マイグレーション、バックアップ・復旧を同時に更新する。
- APIレスポンスやページDOMを変更するときは `api-info/`、実装、fixtureのどれを正とするか確認し、秘密情報や個人情報を記録しない。
- UI変更は単一の画面サイズだけで判断せず、該当するPlaywrightテストと実ブラウザーで確認する。
- 仕様、操作、構成、配信URLが変わった場合にREADMEを更新する。ファイルサイズや行数など、更新で即座に陳腐化する情報は記載しない。
