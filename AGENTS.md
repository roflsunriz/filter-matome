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
- `local/features/scripts/build.ts` がBun bundlerによる単一バンドル、Worker、Service Worker、静的HTMLの生成を一元管理します。
- 個別ビルドはありません。どのプロジェクトを更新した場合も `bun run build` で全成果物を生成してください。
- `extensions/` には NicoCache_nl 用Java拡張のソースとコンパイル済みクラスがあります。コンパイルには、このリポジトリに含まれない NicoCache_nl 本体のソースとJDKが必要です。`C:\NicoCache_nl\src\` を利用できる環境ではコンパイルできますが、このリポジトリだけで完結するビルドではありません。

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
