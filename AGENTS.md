# AGENTS.md

## 作業開始前の必須手順（最優先・例外なし）

1. エージェントは、調査、計画、コマンド実行、スキル利用、ファイル編集、コミット、プッシュを始める前に、必ずリポジトリ直下の `.\COMMON-AGENTS.md` を開き、先頭から末尾まで全文を読む。
2. `COMMON-AGENTS.md` はGit管理外のシンボリックリンクである。`git`や既定のignore設定が有効な`rg --files`の検索結果だけで、ファイルが存在しないと判断してはならない。PowerShellでは最初に次を実行する。

```powershell
Get-Content -Raw -LiteralPath .\COMMON-AGENTS.md
```

3. 読み取りに失敗した場合、出力が省略された場合、または末尾まで読めたことを確認できない場合は、一切の作業を開始せず、パスとシンボリックリンク先を確認して全文を再取得する。必要なら分割して末尾まで読む。
4. 全文を読了するまで、ローカル `AGENTS.md` だけを根拠に作業を続けてはならない。読了後は `COMMON-AGENTS.md` を最優先の指針とし、読了直後の最初の進捗報告で全文を読了したことを明示する。
   このファイルでは `filter-matome` 固有の補足だけを記載する。

## Environment

### 作業前に確認する文書

- リポジトリ全体の用途と導入方法はルートの `README.md`、更新方法は `how-to-update.md`、開発規約は `CONTRIBUTING.md` を確認する。
- TypeScript機能群を変更する前に `local/features/README.md` と、対象ディレクトリの `README.md` を確認する。
- `nlFilters/` を変更する前に `nlFilters/nlFilters_編集ガイド.md` を確認する。
- `scripts/` のスクリプトを変更または実行する前に、対応する `scripts/README.*.md` を確認する。
- ユーザー操作、構成、設定、ビルド手順、外部連携が変わる場合は、対象README、`how-to-update.md`、`docs/`、`CHANGELOG.md` の更新要否を確認する。

### リポジトリ構成

- `local/features/` はBunとTypeScriptで実装された主要機能群である。ソースは `src/`、テストは `tests/`、ビルド定義は `scripts/`、生成物は `dist/` に置かれる。
- `local/background-images/` は `mlink-video-controller` から選択できる背景画像である。ブラウザーからはNicoCache_nl経由で `/local/background-images/` として参照される。
- `nlFilters/` はNicoCache_nl専用DSLのフィルターである。JavaScriptやCSSの挿入、レスポンス本文の置換などを行う。`100_features.txt` が `local/features/dist/features.js` をニコニコ動画側へ読み込む主要フィルターである。
- `docs/` はMkDocsで公開する利用者向け文書、`docs/resources/` は文書内の画像、`cover-images/` はルートREADMEの機能プレビュー画像である。
- `scripts/` はシンボリックリンク作成、Java拡張のビルド、動画変換、ドキュメント生成などの補助スクリプトである。用途の異なるスクリプトが混在するため、名前だけで判断して実行しない。
- NicoCache_nlの終了と再起動は、本体に付属するGUIまたは標準ランチャーを使用する。リポジトリには本体プロセス管理用のスクリプトを含めない。
- `extensions/` はNicoCache_nl用Java拡張の `.java` と対応する `.class` を管理する。TypeScriptのBunビルドには含まれない。コンパイルにはJDKと、このリポジトリに含まれないNicoCache_nl本体が必要である。各拡張は常に単一の実行クラスファイルだけで完結させ、内部クラス・補助クラス・匿名クラスなどの追加 `.class` を生成しない。Java変更後はコンパイル先に拡張名の追加 `.class` がないことを確認する。
- `.github/workflows/` はCI、ドキュメント公開、リリース生成の正式な自動化定義である。ビルド、検証、配布物を変更するときは併せて確認する。

### `local/features/src/` の構成

- `features.ts`: URLに応じて各機能を読み込むブラウザー側のエントリーポイント。
- `api-info/`: NicoCache_nlおよびニコニコ動画関連APIの仕様メモとレスポンス例。
- `cache-data-manager/`: NicoCache_nlのキャッシュ一覧、検索、削除などを扱う管理UI。
- `comment-filter2/`: コメント取得、フィルタリング、設定UI。`integrations/video-player-bridge.ts` が `video-player` との連携境界である。
- `common/`: Material Design Icons、共通ヘッダー、ロガー、トースト、APIクライアントなど、複数機能で共有する実装。
- `mlink-video-controller/`: 視聴ページの操作パネルと機能モジュール群。`modules/` が個別機能、`module-handlers/` が読み込み・設定UIなどの管理を担当する。
- `movie-info/`: キャッシュ、サムネイル、GPAC解析、視聴API情報を集約するダッシュボード。
- `mylist2/`: 独自マイリストのUI、永続化、インポート・エクスポート、Service Worker。
- `runtime/`: ページコンテキストで処理を実行するためのランタイム境界。
- `types/`: グローバル型と各機能で共有する型定義。
- `video-player/`: ローカルキャッシュ動画のスタンドアロンプレイヤー、コメント描画、再生制御。
- `watch-history/`: 視聴履歴SPA、視聴追跡、検索、統計、データ移行。

`common/`、`types/`、`runtime/`、`features.ts` の変更は複数機能へ波及する。利用元を検索し、関連する単体テストとPlaywrightテストをまとめて確認する。

### TypeScript機能群のセットアップ、ビルド、検証

- 作業ディレクトリは `local/features/` である。
- Bunの要求バージョンは `package.json` の `packageManager`、依存関係の固定状態は `bun.lock` を正とする。初回セットアップまたは依存関係変更時は `bun install` を実行する。
- 個別プロジェクト用のビルドはない。どの機能を変更した場合も、次の標準コマンドで全体を検証する。

```powershell
cd local/features
bun run format
bun run lint
bun run type-check
bun run test
bun run build
```

- `bun run test:unit` はBunによる単体テストだけを実行する短縮確認である。`bun run test` は単体テストに加えて、`package.json` で列挙された `tests/*.spec.ts` のPlaywrightテストをヘッドレスChromiumで実行する。
- `local/features/tests/fixtures/` は実ページ相当のテストfixture、`local/features/test-results/` はPlaywrightの一時生成物である。`test-results/` は編集またはコミットしない。
- `local/features/scripts/build.ts` は、ビルド開始時に `dist/` を削除してから、`src/features.ts` の単一バンドル、comment-filter2のWorker、mylist2のService Worker、mylist2・movie-info・video-player・watch-historyの静的HTMLを一括生成し、必要ファイルが揃っていることも検証する。
- `local/features/dist/` はGit管理外の生成物であり、手編集しない。`bun run build` で再生成する。

### ドキュメントとJava拡張のビルド

- MkDocs文書はリポジトリ直下で `mkdocs build --strict` を実行して検証する。初回セットアップでは `python -m pip install -r requirements-docs.txt` が必要で、生成先の `.mkdocs-build/` はGit管理外である。
- Java拡張はBunビルドとは別系統である。変更時は `scripts/README.java-toolbox.md` と対象ソースの依存関係を確認し、利用可能なNicoCache_nl本体とJDKがある場合に限ってコンパイルする。既存の `.class` をソースと無関係に上書きしない。

## NicoCache_nlの現行パスモデル

- 以下では、アプリケーション本体のルートを `NICO_APP_ROOT`、実行時にNicoCache_nlが使用するユーザーデータルートを `NICO_DATA_ROOT` と表記する。現在の環境ではそれぞれ `C:\NicoCache_nl` と `C:\Users\UserName\Documents\NicoCache_nl` である。
- `NICO_DATA_ROOT` は `C:\NicoCache_nl\config.properties` の `userDataRoot` で設定され、起動時の `nicocache.userDataRoot` システムプロパティやランチャー指定があればそちらが優先される。ポータブル起動や開発起動ではアプリケーションルートがデータルートになる場合もあるため、パスを推測せず毎回設定と `NicoCachePaths.dataRoot()` を確認する。
- `extensions`、`local`、`cache`、`certs`、`data`、`nlFilters`、`NicoCacheGUI.property` などの実行時データは `NICO_DATA_ROOT` 配下にある。`NICO_APP_ROOT` はソース、JAR、設定、起動スクリプトなど本体側のファイルを置くルートであり、両者を混同しない。

## NicoCache_nl連携の制約

- ブラウザー側の `window.NicoCache_nl.watch` と、NicoCache_nl本体が提供する `/cache/*` HTTP APIを区別する。
- `window.NicoCache_nl.watch` は `NICO_DATA_ROOT\local\nllib_watch.js` が提供する互換ヘルパーであり、ニコニコ動画の `server-response` メタ情報や視聴ページの `fetch` レスポンスに依存する。ニコニコ動画側の構造変更へすぐ追従できない場合があるため、第一の情報源にはしない。
- 現在の動画IDはURLまたは呼び出し元から明示された値を優先し、再生状態は `HTMLMediaElement` など対象ページの実体を優先する。`window.NicoCache_nl.watch` は、それらから取得できない情報のフォールバックとして、存在確認、型確認、失敗時処理を入れて使用する。
- `/cache/*` はNicoCache_nl本体のHTTP APIである。ローカルキャッシュ固有の状態や操作には利用してよい。例として `https://www.nicovideo.jp/cache/info/v2` があり、実装は `C:\NicoCache_nl\src\dareka\processor\impl\CacheDirProcessor.java` にある。利用前に実装、既存のAPI仕様メモ、エラー形式を確認する。
- このリポジトリの成果物は、主に `NICO_DATA_ROOT` 側に作成されたシンボリックリンクから参照される。例えば `NICO_DATA_ROOT\nlFilters\100_features.txt` は `C:\filter-matome\nlFilters\100_features.txt` を参照する。リンクは双方向ではないため、作成、置換、削除の前に `LinkType` と `Target` を確認する。
- NicoCache_nlをプロキシーとして起動し、対象のローカル配信が有効な場合、`NICO_DATA_ROOT\local\` 配下は `https://www.nicovideo.jp/local/` 配下として配信される。

## NicoCache_nl本体の変更とビルド

- NicoCache_nl本体のソースは `C:\NicoCache_nl\src\` にある。

## NicoCache_nlの起動・終了・再起動・デバッグ

### 終了

- 本体はプロキシーポートと別に、`127.0.0.1`だけでランダムポートを待ち受ける。
- ポートとBearerトークンはユーザーデータの`data/nicocache-control.properties`にある。
- Authorization: Bearer <data/nicocache-control.properties の token>
- `/api/control/graceful-shutdown` POST `202`、`{"status":"stopping"}`
- `/api/control/force-shutdown` POST `202`、`{"status":"forcing"}`
- 認証なし・トークン不一致は401、未知のパスは404を返す。

### 起動と再起動

`NICO_APP_ROOT` の
java -jar .\NicoCacheLauncher.jar --headless --start
java -jar .\NicoCacheLauncher.jar --headless --status
java -jar .\NicoCacheLauncher.jar --headless --stop
java -jar .\NicoCacheLauncher.jar --headless --check-data-root

### デバッグ

- デバッグ時は、変更前の値を記録してから `NICO_DATA_ROOT\NicoCacheGUI.property`（現在は `C:\Users\UserName\Documents\NicoCache_nl\NicoCacheGUI.property`）の `DebugMode=false` を `DebugMode=true` に変更し、上記の終了・再起動手順を使う。ログファイルは `NICO_APP_ROOT\debug.log` など同ファイルの `DebugLog` で指定された場所へ出力される。
- 検証後は、ユーザーから継続指定がない限り `DebugMode` を元の値へ戻し、同じ終了・再起動手順で反映する。ログに秘密情報や個人情報が含まれる可能性を考慮し、内容を無制限に出力またはコミットしない。

## NicoCache_nlの主要パス

- `NICO_APP_ROOT`（現在は `C:\NicoCache_nl`）: `src\`、`NicoCache_nl.jar`、`lib\`、`defaults\`、`documents\`、`config.properties`、`build-*.ps1`、起動スクリプトなど、本体・開発・起動に必要なファイル。
- `NICO_DATA_ROOT`（現在は `C:\Users\UserName\Documents\NicoCache_nl`）: `extensions\`、`cache\`、`cvcache\`、`thcache\`、`certs\`、`data\`、`local\`、`nlFilters\`、`list\`、`NicoCacheGUI.property`、`proxy.pac` など、実行時に参照・更新されるユーザーデータ。

- `.externalToolBuilders\`: EclipseのAnt外部ツールビルダー設定。
- `.settings\`, `.classpath`, `.project`: IDEおよびJavaプロジェクトの設定。
- `NICO_DATA_ROOT\cache\`: 視聴時に作成されるHLSなどの動画キャッシュ。
- `NICO_DATA_ROOT\cvcache\`: `convertedCacheFolder` の既定値であり、ローカル変換されたMP4の保存先。
- `NICO_DATA_ROOT\thcache\`: 動画サムネイルのキャッシュ。
- `NICO_DATA_ROOT\certs\`: `genCerts.bat` または `genCerts.sh` が生成する認証局とサイト証明書の秘密情報。内容を出力またはコミットしない。
- `NICO_DATA_ROOT\data\`: `cors\` と `tlsclient\` など、CORS制御とTLSクライアントに関するデータ。
- `defaults\`: NicoCache_nlが参照する既定設定群。変更可能な全項目が必ず揃っているとは仮定せず、実装と `config.properties.default` も確認する。
- `documents\`, `Readme.txt`, `Readme_dms.txt`, `変更点.txt`, `ChangeLog.txt`: NicoCache_nl本体の説明と変更履歴。
- `NICO_DATA_ROOT\extensions\`: NicoCache_nl用Java拡張。`C:\filter-matome\extensions\` の `.class` を参照するシンボリックリンクも配置される。
- `lib\`: Bouncy Castleなど、NicoCache_nl本体と証明書生成で使用する依存ライブラリ。
- `link\`, `others\`: 関連Webページなどへのショートカット。
- `NICO_DATA_ROOT\list\`: `NGtitle.txt` などのリストファイル。
- `NICO_DATA_ROOT\local\`: ブラウザーへ配信するJavaScript、CSS、画像、ビルド成果物など。`background-images\`, `features\`, `images\`, `list.js`, `mime.types` にはこのリポジトリを参照するシンボリックリンクが配置される。
- `NICO_DATA_ROOT\nlFilters\`: JavaScript、CSS、画像の追加やHTML置換を行うNicoCache_nl専用DSLフィルター。
- `NICO_APP_ROOT\scripts\`: `C:\filter-matome\scripts\` を参照するシンボリックリンク。
- `NICO_APP_ROOT\src\`: NicoCache_nl本体のJavaソースと、ビルドスクリプトが生成するクラスファイルの配置先。
- `build.xml`, `build-ant.ps1`, `build-javac.ps1`, `manifest-nl.mf`: 通常ビルドの設定とスクリプト。
- `config.properties`, `config.properties.default`: 本体側の設定。`NicoCacheGUI.property` は `NICO_DATA_ROOT` 配下のGUI設定。
- `genCerts.bat`, `genCerts.sh`, `NicoCacheCA.jar`: 認証局とサイト証明書の生成手段。詳細は `documents\Readme_CA.txt` を確認する。
- `NicoCache_nl.jar`: プロキシー実行本体。`.sig` は対応する署名ファイル。
- `NicoCache_nl Starter.bat`, `NicoCache_nl.bat`, `NicoCache_nl.sh`, `RunNicoCache.ps1`: GUIまたはコンソールから本体を起動するスクリプト。
- `NicoCacheGUI_native.dll`, `NicoCacheGUI_native64.dll`: NicoCacheGUIのネイティブライブラリ。
- `nlFilter_sys.txt`: システム用nlFilter。
- `NICO_DATA_ROOT\proxy.pac`: プロキシー自動構成ファイル。`NICO_APP_ROOT\proxy_sample.pac`: サンプル。

この一覧は現在の基本構造であり、NicoCache_nlの更新やローカル環境によって変わる。用途が確認できないファイルやフォルダーを推測で変更せず、付属ドキュメント、設定、ソースコード、シンボリックリンクの参照先を確認する。
