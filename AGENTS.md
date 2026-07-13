# AGENTS.md

共通ルールは `COMMON-AGENTS.md` を必ず確認し、上位方針として扱う。
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
- `extensions/` はNicoCache_nl用Java拡張の `.java` と対応する `.class` を管理する。TypeScriptのBunビルドには含まれない。コンパイルにはJDKと、このリポジトリに含まれないNicoCache_nl本体が必要である。
- `.github/workflows/` はCI、ドキュメント公開、リリース生成の正式な自動化定義である。ビルド、検証、配布物を変更するときは併せて確認する。

### `local/features/src/` の構成

- `features.ts`: URLに応じて各機能を読み込むブラウザー側のエントリーポイント。
- `api-info/`: NicoCache_nlおよびニコニコ動画関連APIの仕様メモとレスポンス例。
- `cache-data-manager/`: NicoCache_nlのキャッシュ一覧、検索、削除などを扱う管理UI。
- `comment-filter2/`: コメント取得、フィルタリング、設定UI。`integrations/video-player-bridge.ts` が `video-player` との連携境界である。
- `common/`: Material Design Icons、共通ヘッダー、ロガー、トースト、APIクライアントなど、複数機能で共有する実装。
- `mlink-video-controller/`: 視聴ページの操作パネルと機能モジュール群。`modules/` が個別機能、`module-handlers/` が読み込み・設定UIなどの管理を担当する。
- `movie-info/`: キャッシュ、サムネイル、MediaInfo、視聴API情報を集約するダッシュボード。
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
- Java拡張はBunビルドとは別系統である。変更時は `scripts/README.auto-build-extensions.md` と対象ソースの依存関係を確認し、利用可能なNicoCache_nl本体とJDKがある場合に限ってコンパイルする。既存の `.class` をソースと無関係に上書きしない。

## NicoCache_nl連携の制約

- ブラウザー側の `window.NicoCache_nl.watch` と、NicoCache_nl本体が提供する `/cache/*` HTTP APIを区別する。
- `window.NicoCache_nl.watch` は `C:\NicoCache_nl\local\nllib_watch.js` が提供する互換ヘルパーであり、ニコニコ動画の `server-response` メタ情報や視聴ページの `fetch` レスポンスに依存する。ニコニコ動画側の構造変更へすぐ追従できない場合があるため、第一の情報源にはしない。
- 現在の動画IDはURLまたは呼び出し元から明示された値を優先し、再生状態は `HTMLMediaElement` など対象ページの実体を優先する。`window.NicoCache_nl.watch` は、それらから取得できない情報のフォールバックとして、存在確認、型確認、失敗時処理を入れて使用する。
- `/cache/*` はNicoCache_nl本体のHTTP APIである。ローカルキャッシュ固有の状態や操作には利用してよい。例として `https://www.nicovideo.jp/cache/info/v2` があり、実装は `C:\NicoCache_nl\src\dareka\processor\impl\CacheDirProcessor.java` にある。利用前に実装、既存のAPI仕様メモ、エラー形式を確認する。
- このリポジトリの成果物は、主に `C:\NicoCache_nl` 側に作成されたシンボリックリンクから参照される。例えば `C:\NicoCache_nl\nlFilters\100_features.txt` は `C:\filter-matome\nlFilters\100_features.txt` を参照する。リンクは双方向ではないため、作成、置換、削除の前に `LinkType` と `Target` を確認する。
- NicoCache_nlをプロキシーとして起動し、対象のローカル配信が有効な場合、`C:\NicoCache_nl\local\` 配下は `https://www.nicovideo.jp/local/` 配下として配信される。

## NicoCache_nl本体の変更とビルド

- NicoCache_nl本体のソースは `C:\NicoCache_nl\src\` にあるが、このリポジトリの管理対象外であり、他のメンテナーによる更新で上書きされる。ユーザーからNicoCache_nl本体の変更を依頼された場合も、原則として `src\` を直接編集しない。
- NicoCache_nl本体の変更が必要な場合は、`C:\NicoCache_nl\` 直下に変更対象だけを含むオーバーレイJavaソースと専用ビルドスクリプトを用意する。正式版への取り込みを依頼できるよう、変更理由、再現手順、修正内容、検証結果を含む日本語の依頼文案も作成する。外部のメンテナーへ実際に送信する場合は、別途ユーザーの許可を得る。
- `C:\NicoCache_nl\ajax-rm-domand-cache-reset\` は既存のオーバーレイソースの一例である。正式版へ取り込まれた後などには削除されることがあるため、使用前に存在と対象バージョンを確認する。
- 対応する `C:\NicoCache_nl\build-ajax-rm-domand-cache-reset.ps1` は、JDKの `javac` と `jar` を使い、ベースソースのコンパイル、オーバーレイのコンパイル、`NicoCache_nl.jar` の再生成まで行う。単なる差分コンパイルではないため、実行前に対象ソース、生成先、復旧方法を確認する。
- 通常ビルドでは、`C:\NicoCache_nl\build-ant.ps1` はApache Ant、`C:\NicoCache_nl\build-javac.ps1` はJDKの `javac` と `jar` および `manifest-nl.mf` に依存する。どちらも `C:\NicoCache_nl\src\` と `NicoCache_nl.jar` を更新するため、ユーザーが依頼したビルドまたは検証の範囲でのみ実行する。
- オーバーレイ、ビルドスクリプト、実行ファイルは環境によって存在しない場合がある。記載されたパスを無条件に仮定せず、毎回存在を確認する。

## NicoCache_nlの起動とデバッグ

- 実行には `C:\NicoCache_nl\RunNicoCache.ps1` または `C:\NicoCache_nl\NicoCache_nl Starter.bat` を使用する。
- デバッグ時は、変更前の値を記録してから `C:\NicoCache_nl\NicoCacheGUI.property` の `DebugMode=false` を `DebugMode=true` に変更して再起動すると、同ファイルの `DebugLog` で指定されたログが出力される。検証後は、ユーザーから継続指定がない限り元の値へ戻す。ログに秘密情報や個人情報が含まれる可能性を考慮し、内容を無制限に出力またはコミットしない。
- 再起動では、すべての `java.exe` や `javaw.exe` を名前だけで一括終了しない。プロセスのコマンドラインと実行パスを確認し、`NicoCache_nl.jar` を実行しているPIDだけを対象にする。GUIや通常の終了手段を優先し、強制終了は通常終了できず、かつユーザーが依頼した作業範囲で必要な場合に限る。

## `C:\NicoCache_nl` の主要パス

- `.externalToolBuilders\`: EclipseのAnt外部ツールビルダー設定。
- `.settings\`, `.classpath`, `.project`: IDEおよびJavaプロジェクトの設定。
- `cache\`: 視聴時に作成されるHLSなどの動画キャッシュ。
- `cvcache\`: `convertedCacheFolder` の既定値であり、ローカル変換されたMP4の保存先。
- `thcache\`: 動画サムネイルのキャッシュ。
- `certs\`: `genCerts.bat` または `genCerts.sh` が生成する認証局とサイト証明書の秘密情報。内容を出力またはコミットしない。
- `data\`: `cors\` と `tlsclient\` など、CORS制御とTLSクライアントに関するデータ。
- `defaults\`: NicoCache_nlが参照する既定設定群。変更可能な全項目が必ず揃っているとは仮定せず、実装と `config.properties.default` も確認する。
- `documents\`, `Readme.txt`, `Readme_dms.txt`, `変更点.txt`, `ChangeLog.txt`: NicoCache_nl本体の説明と変更履歴。
- `extensions\`: NicoCache_nl用Java拡張。`C:\filter-matome\extensions\` の `.class` を参照するシンボリックリンクも配置される。
- `lib\`: Bouncy Castleなど、NicoCache_nl本体と証明書生成で使用する依存ライブラリ。
- `link\`, `others\`: 関連Webページなどへのショートカット。
- `list\`: `NGtitle.txt` などのリストファイル。
- `local\`: ブラウザーへ配信するJavaScript、CSS、画像、ビルド成果物など。`background-images\`, `features\`, `images\`, `list.js`, `mime.types` にはこのリポジトリを参照するシンボリックリンクが配置される。
- `nlFilters\`: JavaScript、CSS、画像の追加やHTML置換を行うNicoCache_nl専用DSLフィルター。
- `scripts\`: `C:\filter-matome\scripts\` を参照するシンボリックリンク。
- `src\`: NicoCache_nl本体のJavaソースと、ビルドスクリプトが生成するクラスファイルの配置先。
- `build.xml`, `build-ant.ps1`, `build-javac.ps1`, `manifest-nl.mf`: 通常ビルドの設定とスクリプト。
- `config.properties`, `config.properties.default`, `NicoCacheGUI.property`: 本体とGUIの設定。
- `genCerts.bat`, `genCerts.sh`, `NicoCacheCA.jar`: 認証局とサイト証明書の生成手段。詳細は `documents\Readme_CA.txt` を確認する。
- `NicoCache_nl.jar`: プロキシー実行本体。`.sig` は対応する署名ファイル。
- `NicoCache_nl Starter.bat`, `NicoCache_nl.bat`, `NicoCache_nl.sh`, `RunNicoCache.ps1`: GUIまたはコンソールから本体を起動するスクリプト。
- `nico-cache-gui-launcher.bat`, `nico-cache-nl-starter.bat`: このリポジトリの同名スクリプトを参照するシンボリックリンク。
- `NicoCacheGUI_native.dll`, `NicoCacheGUI_native64.dll`: NicoCacheGUIのネイティブライブラリ。
- `nlFilter_sys.txt`: システム用nlFilter。
- `proxy.pac`, `proxy_sample.pac`: プロキシー自動構成ファイルとそのサンプル。

この一覧は現在の基本構造であり、NicoCache_nlの更新やローカル環境によって変わる。用途が確認できないファイルやフォルダーを推測で変更せず、付属ドキュメント、設定、ソースコード、シンボリックリンクの参照先を確認する。
