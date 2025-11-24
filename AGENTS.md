# This is AGENTS.md for the project
# This document is desigined for the agents to follow

## Global Instructions

- 常に日本語で応答してください
- Typescriptのファイル編集後は npm run lint, npm run type-check, npm run buildを実行してコード品質を確認してください。必要があればクリーンになるまで修正してください
- Typescriptではない場合はnpm run lint, npm run type-check, npm run buildは必要ありません。
- 作業が完了したら、新規ファイルを含む git diff を確認し、変更内容を要約した 5 行までのコミットメッセージを生成してください。

## Environment

- local/features/src/ には、各プロジェクトのソースコードがあります。
- local/background-images/ はmlink-video-controllerで使われる背景画像です。
- local/images/ はlocal/features/src/docs/comment-filter2 で使われる使い方を説明するための画像があります。
- local/features/src/common/ には、共通ライブラリのソースコードがあります。マテリアルデザインアイコンのヘルパーもここにあります。また、コモンヘッダーのソースコード、共通ロガー、共通トースト通知もあります。
- local/features/src/types/ には、各プロジェクトの型定義があります。
- local/features/dist/ には、ビルド済みのファイルがあります。
- nlFilters/ には、各プロジェクトのフィルターがあります。NicoCache_nl専用DSLフィルターです。NicoCache_nlはローカルプロキシサーバーで、ニコニコ動画のコンテンツをローカルにキャッシュして視聴することができます。nlFiltersを使用するとNicoCache_nlでスクリプトやCSSを追加することができます。特定のHTMLを置き換えたりもできます。
- nlFilters/resources/ には、199_readme.htmlのリソースがあります。
- scripts/ にはNicoCache_nl用のスクリプトがあります。
- ビルドするときにはlocal/features/ に移動して npm run build を実行してください。
- comment-filter2 にはvideo-playerと連携するためのvideo-player-bridge.tsがあります。
- mlink-video-controller には各モジュールのソースコードがあります。modulesフォルダとmodule-handlersフォルダには各モジュールのソースコードがあります。モジュールの読み込みと管理はmodule-handlersフォルダにあります。モジュールの設定はsettings-manager.tsとsettings-ui.tsで管理されています。
- 各プロジェクトのルートにREADME.mdがあります。これは各プロジェクトの説明と編集ガイドが書かれています。これを読み込んでからプロジェクトの編集にかかるとスムーズに編集できます。変更後はREADME.mdを更新してください。
- local/features/config/ にはViteの設定ファイルがあります。
- npm run build:comment-filter2 などのコマンドで個別ビルドして時間を短縮できます。詳細はlocal/features/package.jsonを参照してください。
- extensions/ にはNicoCache_nl用の拡張機能があります。これはNicoCache_nlで使用される拡張機能です。ビルドするにはNicoCache_nlのソースコードが必要です。このワークスペースにはないのでコンパイルできません。
- アップデートまたは単に`/update`を指示されたときは`how-to-update.md`の指示に従いアップデート操作を行ってください。