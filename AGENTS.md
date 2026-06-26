# AGENTS.md

共通ルールは `COMMON-AGENTS.md` を必ず確認し、上位方針として扱う。
このファイルでは `filter-matome` 固有の補足だけを記載する。

## Environment

- `local/features/src/` には、各プロジェクトのソースコードがあります。
- `local/background-images/` は mlink-video-controller で使われる背景画像です。
- `local/images/` は local/features/src/docs/comment-filter2 で使われる使い方を説明するための画像があります。
- `local/features/src/common/` には、共通ライブラリのソースコードがあります。マテリアルデザインアイコンのヘルパー、コモンヘッダー、共通ロガー、共通トースト通知もあります。
- `local/features/src/types/` には、各プロジェクトの型定義があります。
- `local/features/dist/` には、ビルド済みのファイルがあります。
- `nlFilters/` には、各プロジェクトのフィルターがあります。NicoCache_nl専用DSLフィルターです。NicoCache_nlはローカルプロキシサーバーで、ニコニコ動画のコンテンツをローカルにキャッシュして視聴できます。nlFiltersを使用するとNicoCache_nlでスクリプトやCSSを追加でき、特定のHTMLを置き換えることもできます。
- `resources/` には、USAGE.mdで使われる画像リソースがあります。
- `scripts/` にはNicoCache_nl用のスクリプトがあります。
- ビルドするときには `local/features/` に移動して `bun run build` を実行してください。
- `comment-filter2` には video-player と連携するための `video-player-bridge.ts` があります。
- `mlink-video-controller` には各モジュールのソースコードがあります。`modules` フォルダと `module-handlers` フォルダには各モジュールのソースコードがあります。モジュールの読み込みと管理は `module-handlers` フォルダにあります。モジュールの設定は `settings-manager.ts` と `settings-ui.ts` で管理されています。
- 各プロジェクトのルートに README.md があります。各プロジェクトの説明と編集ガイドが書かれているため、編集前に確認してください。変更後は README.md を更新してください。
- `local/features/config/` には Vite の設定ファイルがあります。
- `bun run build:comment-filter2` などのコマンドで個別ビルドして時間を短縮できます。詳細は `local/features/package.json` を参照してください。
- `mylist2`、`comment-filter2`、`mlink-video-controller` を更新したときは、併せて `video-player` もビルドしてください。一緒にバンドルされているためです。
- `extensions/` には NicoCache_nl 用の拡張機能があります。これはNicoCache_nlで使用される拡張機能です。ビルドするには NicoCache_nl のソースコードが必要です。このワークスペースにはないのでコンパイルできません。
