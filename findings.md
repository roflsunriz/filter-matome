# findings.md

filter-matome の実現手段、共通指針の適用条件と調査知見の正本。作業前に全文読む。利用者向けの導入・使用方法はREADME、更新の手順はhow-to-update.md、実施結果と未検証事項はverification.mdを参照する。移した記述の確認日・条件・留保は元のまま保持し、文書移動を再実測と解釈しない。

## 共通指針の適用条件と代替検証

- 対象の共通ルール: 設計と実装方針／検証／生成物とビルド成果物／表示品質とレスポンシブ対応
- 理由: TypeScript機能群・nlFilter DSL・Java拡張・文書サイトで構成され、それぞれ作業場所とビルドが異なる。公式パネルのインライン座標に勝つ必要がある限定箇所は!importantを使う。
- 適用範囲: local/features、nlFilters、extensions、docs、および以下の原宿風Watch共通パネル規則に記す対象5パネル
- 同等の品質を保つ手段・検証: 各系統の既存ビルド、単体・Playwright・公式資産の世代横断検証、配信経路の確認を行う。!importantの範囲は許可検証とharajuku-style-contract.test.tsで固定し、対象外へ広げない。

新たな免除や操作許可を追加するものではない。AGENTS.mdの禁止・承認条件と共通指針は引き続き有効。

<a id="agents-1"></a>

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

- Zensical文書はリポジトリ直下で `python scripts/build-docs.py` を実行して検証する。初回セットアップでは `python -m pip install -r requirements-docs.txt` が必要で、生成先の `.mkdocs-build/` はGit管理外である。公開時の `DOCS_BUILD_DATE` はビルド前に各ページへ反映する。
- Java拡張はBunビルドとは別系統である。変更時は `scripts/README.matome-toolbox.md` と対象ソースの依存関係を確認し、利用可能なNicoCache_nl本体とJDKがある場合に限ってコンパイルする。既存の `.class` をソースと無関係に上書きしない。

移動元: `AGENTS.md`。

<a id="agents-2"></a>

## NicoCache_nlの現行パスモデル

- 以下では、アプリケーション本体のルートを `NICO_APP_ROOT`、実行時にNicoCache_nlが使用するユーザーデータルートを `NICO_DATA_ROOT` と表記する。現在の環境ではそれぞれ `C:\Users\UserName\AppData\Local\NicoCache_nl` と `C:\Users\UserName\Documents\NicoCache_nl` である。
- `NICO_DATA_ROOT` は `C:\Users\UserName\AppData\Local\NicoCache_nl\config.properties` の `userDataRoot` で設定され、起動時の `nicocache.userDataRoot` システムプロパティやランチャー指定があればそちらが優先される。ポータブル起動や開発起動ではアプリケーションルートがデータルートになる場合もあるため、パスを推測せず毎回設定と `NicoCachePaths.dataRoot()` を確認する。
- `extensions`、`local`、`cache`、`certs`、`data`、`nlFilters`、`NicoCacheGUI.property` などの実行時データは `NICO_DATA_ROOT` 配下にある。`NICO_APP_ROOT` はソース、JAR、設定、起動スクリプトなど本体側のファイルを置くルートであり、両者を混同しない。

移動元: `AGENTS.md`。

<a id="agents-3"></a>

## nlFilterによる公式資産APIの変更契約（必須）

- sandboxの`capture-official-watch-bundle.ts`で保存した資産は、NicoCache_nl経由だと別機能のAPIが挿入済みの場合がある（2026-09-12確認）。保管SHA-256を無条件に公式CDN原本のハッシュとみなさず、`FilterMatome` markerと変更対象classを調べる。同一URLの無改変版・適用済み版は別世代に数えない。全編先読みでは`analyze-full-buffer.ts`がHLS sessionのclass本文ハッシュを併記し、session外だけの変更と対象自身の改変を区別する。
- 全編先読みAPIはv2の`getState()`・`getPlan()`で現在の映像・音声の取得計画だけを公開する。v1の再生用バッファーへの全編保持はブラウザーの容量制限で失敗するため復活させない。`full-preload.ts`が小さなストリームとして取得し、同じ画質・音質のNicoCache_nl完成キャッシュを確認して100%にする。HLSの上限・読込位置・再生状態は変更しない。根拠と世代比較は`local/features/src/sandbox/full-buffer-bridge.md`を参照する。
- キャッシュ品質の`videoMode`は公式品質IDから`video-<codec>-`を除き、`-lowest`等も保持する。実寸法の`height`とは一致しない（2026-09-13、sm45650421の360p配信は354px）。音声は`audio-<codec>-<数値>kbps`の数値部を使い、`-hr`を末尾のビットレートと誤認しない。NicoCache_nlの`DomandCVIEntry.videoSrcIdToCacheQualityExpression()`・`audioSrcIdToCacheQualityExpression()`が照合先の根拠。
- Firefox 155.0.1の実プロフィールでは、公式ES Moduleが`fetch(cache: reload)`では新版、`script`読込では旧版のままになる事例を確認した（2026-09-13）。一度の強制再読み込みやFirefox再起動だけでは反映されなかった。検証タブで一時的にHTTPキャッシュを無効化して再取得し、元へ戻した通常の再読み込み後に実APIの返却値と機能を確認する。API版だけで同じ版の修正反映を断定しない。詳細は`verification.md`を参照。
- 公式Watchの後方シークは`FilterMatomePlaybackControlApi`から公式mediaの`seek(time)`→`setCurrentTime(time)`を順に呼ぶ（2026-09-13確認）。HTMLVideoElementの時刻だけでは`_setCurrentTime`と`smoothTime`が残り、確定処理だけでも途中のtickが旧時刻へ戻し得る。同期中の時刻は公式の既定getterで読み、A-B・mlinkのシーク・再生/停止を同じ境界へ接続する。`#video-element`のローカル再生は公式時計の対象外。契約は`local/features/src/sandbox/playback-control-bridge.md`を参照する。

- nlFilterで公式JavaScript資産へAPIを公開・接続するときは、新規追加、既存APIの編集、Match/Replaceの追従、API削除を一体の契約変更として扱う。フィルターだけを変更して完了にしない。
- 追加・編集前に`local/features/src/sandbox/`の取得済み資産と契約・Match履歴を確認し、複数世代（最低3世代、存在するPC/responsive等の変種を含む）で同じ意味上の境界と参照関係が成立し、十分に汎化されていることを検証する。最新1資産への一致や同一内容の複製を複数世代の根拠にせず、minify名が変化した世代も比較する。資産不足なら追加取得し、未確認のまま汎化済みとしない。
- 世代ごとにURL、取得日時、SHA-256、サイズ、Match一致数、前版との差分、採用した不変条件をsandboxの対応文書へ記録する。対象箇所への期待一致数（単一挿入なら1回）、対象外資産で0回、置換後の構文、公式store/action/controller等の参照関係と公開APIの動作を確認する。識別子の無条件ワイルドカード化や単語一致だけで対象を広げない。検証対象数、結果、未検証と理由を`verification.md`へ残す。
- APIの追加・編集・削除と同じ変更内で、CommonHeaderに挿入するFilter-Matome APIタブ（現行の`filter-matome` API状態メニュー）の項目と自動プローブを必ず追加・編集・削除する。追加時は項目とプローブを接続し、編集時は版・必須メソッド・適用ページ・判定条件・説明を同期し、削除時は項目、プローブ、型、翻訳、テスト、文書の不要な参照を取り除く。
- 自動プローブは手動操作なしで実行され、APIの存在・版・必須メソッド、必要に応じて読込済み資産の固有markerを副作用なしで検査する。未検出、版不一致、検査中、検査失敗、適用対象外を有効と混同しない。既読化、再取得、再生状態変更、メニュー開閉等の操作APIを診断目的で呼ばない。特に`FilterMatomeNotificationReadApi.refresh()`は呼ばない。
- 変更時は`local/features/src/common/api-status-menu.ts`と関連runtime・表示・翻訳、`local/features/tests/common-api-status-menu.test.ts`、`local/features/tests/common-api-status-menu.spec.ts`を確認・更新し、遅延公開、再描画、SPA遷移と自動再検査後の表示も検証する。sandboxでの世代横断検証に加え、NicoCache_nlの実配信経路からAPIとタブの自動判定が成立することを確認する。個別契約の根拠はsandboxの`playback-rate-bridge.md`、`comment-reload-match-history.md`、`comment-context-menu-match-history.md`、`common-header-notification-read-all.md`を参照する。

移動元: `AGENTS.md`。

<a id="agents-4"></a>

## NicoCache_nl連携の制約

- CommonHeader通知の一括既読後の表示更新は、`nlFilters/100_features.txt`が公式action factoryへ公開する`FilterMatomeNotificationReadApi`（版と`refresh()`のみ）を使う。`refresh()`は開いているパネルだけ公式一覧を再取得するため、自動プローブから呼ばない。2026-09-05に3.11.0〜3.13.0のPC/responsive計6資産で確認済み。Match追従時は既存sandbox資産を先に比較し、同じstore/reset状態/公式actionの参照関係を維持する。根拠と検証は`local/features/src/sandbox/common-header-notification-read-all.md`を参照。

- ブラウザー側の `window.NicoCache_nl.watch` と、`https://nicocachenl.test/api/v1`で提供するNicoCache_nl REST APIを区別する。
- `window.NicoCache_nl.watch` は `NICO_DATA_ROOT\local\nllib_watch.js` が提供する互換ヘルパーであり、ニコニコ動画の `server-response` メタ情報や視聴ページの `fetch` レスポンスに依存する。ニコニコ動画側の構造変更へすぐ追従できない場合があるため、第一の情報源にはしない。
- 現在の動画IDはURLまたは呼び出し元から明示された値を優先し、再生状態は `HTMLMediaElement` など対象ページの実体を優先する。`window.NicoCache_nl.watch` は、それらから取得できない情報のフォールバックとして、存在確認、型確認、失敗時処理を入れて使用する。
- ローカルキャッシュ固有の状態や操作には`https://nicocachenl.test/api/v1`を利用する。CMAF/Domand HLSの情報源は`GET /api/v1/videos/<動画ID>/cache-entries`であり、実装は`C:\Users\UserName\AppData\Local\NicoCache_nl\src\dareka\processor\impl\NicoCacheWebProcessor.java`と`CmafCacheInfo.java`にある。キャッシュ実体と再生中CMAFは`https://nicocachenl.test/media/v1`から配信し、旧`/cache/*`は利用しない。
- このリポジトリの成果物は、主に `NICO_DATA_ROOT` 側に作成されたシンボリックリンクから参照される。例えば `NICO_DATA_ROOT\nlFilters\100_features.txt` は `C:\filter-matome\nlFilters\100_features.txt` を参照する。リンクは双方向ではないため、作成、置換、削除の前に `LinkType` と `Target` を確認する。
- NicoCache_nlをプロキシーとして起動し、対象のローカル配信が有効な場合、`NICO_DATA_ROOT\local\` 配下は `https://www.nicovideo.jp/local/` 配下として配信される。

移動元: `AGENTS.md`。

<a id="agents-5"></a>

## 原宿風Watch共通パネルの固定位置（2026-09-27）

- 公式Watchのギフト等の共通パネルは`position: fixed`でも、公式JavaScriptがインライン`left`・`top`をスクロール中に更新する。原宿風配置は通常のCSS宣言だけでは勝てないため、対象5パネルの`position`・`left`・`top`に限って`!important`を許可する。`local/features/scripts/harajuku-stylesheet.ts`の許可検証と`harajuku-style-contract.test.ts`を同時に更新する。
- `/local/features/dist/watch-harajuku.css`は同じURLで再ビルドするとブラウザーが旧CSSを保持する場合がある。原宿風CSSを変えるリリースでは`harajuku-style-contract.ts`と`nlFilters/104_watch_harajuku_style.txt`の版付きURLを揃える。CDP実測と未検証条件は`verification.md`の#256節を参照する。

移動元: `AGENTS.md`。

<a id="agents-6"></a>

## NicoCache_nl本体の変更とビルド

- NicoCache_nl本体のソースは `C:\Users\UserName\AppData\Local\NicoCache_nl\src\` にある。

移動元: `AGENTS.md`。

<a id="agents-7"></a>

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

移動元: `AGENTS.md`。

<a id="agents-8"></a>

## NicoCache_nlの主要パス

- `NICO_APP_ROOT`（現在は `C:\Users\UserName\AppData\Local\NicoCache_nl`）: `src\`、`NicoCache_nl.jar`、`lib\`、`defaults\`、`documents\`、`config.properties`、`build-*.ps1`、起動スクリプトなど、本体・開発・起動に必要なファイル。
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
- `NICO_DATA_ROOT\local\`: ブラウザーへ配信するJavaScript、CSS、画像、ビルド成果物など。`background-images\`, `features\`, `images\`, `mime.types` にはこのリポジトリを参照するシンボリックリンクが配置される。
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

移動元: `AGENTS.md`。

<a id="readme-1"></a>

## 依存更新の自動処理

Dependabot は対象の依存関係を毎週確認します。patch／minor／major 更新は PR のチェック（CI）が成功した後に自動で squash merge されます。CI の失敗ジョブは 1 回だけ再実行します。再失敗した PR は残して手動で修正します。マージ後はデプロイ workflow を明示起動します。

移動元: `README.md`。

<a id="update-1"></a>

## Dependabot PR の更新

前提は `.github/dependabot.yml` と PR 用 CI（CI）です。更新 PR の head SHA と `gh pr checks <PR番号>` の結果を確認してください。patch／minor／major は全チェック成功後に自動取り込みされます。初回 CI 失敗は failed jobs のみを 1 回再実行し、再失敗した PR は残して手動で修正します。

設定を変えたときは `actionlint .github/workflows/dependabot-automation.yml` と実際の PR の Actions 結果を確認します。問題があれば呼び出し先の共通 workflow SHA を直前の検証済み値へ戻すコミットを push します。取り込まれた依存更新に問題があれば通常の revert コミットで復旧します。

CI 完了より Dependabot の分類が遅れる場合は、`callback_workflow_file` が指す呼び出し側 workflow を `workflow_dispatch` し、同じ PR 番号・head SHA・全チェックを再確認する。呼び出し側のファイル名を変える際はこの入力も一緒に更新する。

移動元: `how-to-update.md`。

<a id="verification-1"></a>

## Dependabot 自動処理（2026-09-23）

`.github/workflows/dependabot-automation.yml` を actionlint で検査し、PR 用 workflow 名（CI）と一致することを確認する。Dependabot の patch／minor／major かつ全 PR チェック成功の場合だけ取り込み、古い SHA・再失敗は残す。

実際の Dependabot PR がまだない場合、動作経路は未検証として扱う。実 PR 発生後に自動化ジョブ、CI の再試行、マージ結果を確認する。

大量の Dependabot PR により CI 完了より分類が遅れる場合でも、分類後の `workflow_dispatch` が現在の PR 番号と head SHA を照合して再評価する。別の作成者、古い SHA、未完了の CI はマージしない。

移動元: `verification.md`。

<a id="extra-12"></a>

## 開発者向け情報

### 技術スタック
- **言語**: TypeScript
- **ビルドツール・ランタイム**: Bun（要求バージョンは `local/features/package.json` を参照）
- **補助ツール**: Java 25、Maven（matome-toolboxの開発・テスト時のみ）
- **静的解析**: ESLint、typescript-eslint
- **テスト**: Bun test、Playwright
- **ストレージ**: IndexedDB
- **UI**: Material Design Icons
- **フィルター言語**: nlFilter (NicoCache_nl独自DSL)

### プロジェクト構成
```
local/
├─ background-images/    # 視聴ページ用の背景画像
└─┬── features/          # メイン機能群
  ├── src/               # TypeScriptソースコード
  │   ├── api-info/             # ニコニコ動画/API仕様メモ
  │   ├── comment-filter2/      # コメントフィルター
  │   ├── common/               # 共通ヘルパー、共通ヘッダー、ロガー、トースト
  │   ├── mlink-video-controller/ # 視聴ページ操作パネルとモジュール
  │   ├── movie-fetcher/        # 一覧カードからDomand/CMAFを取得
  │   ├── movie-info/           # 動画/API情報ダッシュボード
  │   ├── mylist2/              # マイリスト2
  │   ├── runtime/              # 配信ページ判定と起動境界
  │   ├── sandbox/              # 外部バンドルを隔離してAPI契約を調査する領域
  │   ├── types/                # 共通型定義
  │   ├── video-player/         # ローカル動画プレイヤー
  │   └── watch-history/        # 視聴履歴SPAと視聴追跡
  ├── tests/             # Bun単体テスト、Playwrightテスト、fixture
  ├── dist/              # Bunで生成した単一バンドル、Worker、静的HTML
  └── scripts/           # Bunビルド・テストスクリプト

nlFilters/
├── 100_features.txt                # CommonHeader導入サービスへfeatures.jsを挿入
├── 101_disable_official_function.txt # serverContext書換設定と公式・mlink再生速度同期
├── 102_comment_reload_api.txt       # 公式コメント再取得actionをcomment-filter2へ公開
├── 103_official_comment_menu.txt    # 公式Reactコメントメニューへcomment-filter2操作を接続
├── 104_watch_harajuku_style.txt     # 公式CSSのlayer隔離と原宿風Watch CSSの先行読込
└── 105_premium_hide.txt            # プレミアム勧誘非表示(ニコニコ動画共通コモンヘッダーのプレミアム勧誘を非表示)

extensions/
├── CommentFilterLogger.java/.class       # コメントフィルターログの受信とGUI表示
├── DestroyAds.java/.class                # 広告生成コードの書き換えと上流通信前の遮断
├── ExtUtil.java/.class                   # Java拡張向けの共通ユーティリティ
├── FilterMatomeSeriesAlerts.java/.class # シリーズ新着の定期確認とOS通知
├── FilterMatomeSmartFetcher.java/.class # 永続予約・暗号化Cookie・帯域制御・取得履歴の管理
├── NicochartInfoProxy.java/.class        # 再生不可時のnicochart.jp動画情報フォールバック
├── nlGpac.java/.class                    # GPACによるローカルキャッシュのメディア解析API
└── nlMovieFetcher.java/.class            # 現行Domand/CMAF配信の取得・進捗確認・中止API

docs/resources/            # USAGE.mdで使われる画像リソース
```

### ビルド方法
```bash
cd local/features
bun install
bun run format
bun run lint
bun run type-check
bun run test
bun run build
```

CIと同じ検証をまとめて実行する場合は`bun run verify`を使用します。CI・リリースでは`bun install --frozen-lockfile`により`bun.lock`との差分を拒否します。

`features.js`はページ判定用の軽量ブートストラップで、必要な機能だけを`entries/`から遅延読み込みします。生成は単一の`bun run build`で一括して行います。
構成、生成物、プロジェクト別READMEは [`local/features/README.md`](local/features/README.md) を参照してください。

### scripts の matome-toolbox

`scripts/` のメディア変換、設定編集、更新、開発者向け操作をまとめたGUI・ヘッドレス対応のJavaアプリです。リリースアーカイブにはビルド済みJARを同梱しているため、利用者はMavenやBunでビルドする必要がありません。固定パス、シェル依存、Python GUI依存、無確認上書きを避け、READMEをプラグインヘルプ辞書として表示します。

メディアファイル名の変更ではffprobeを優先し、利用不能・情報不足時はGPACへフォールバックして、実測した解像度と音声ビットレートからNicoCache互換名を自動構築します。

開発補助プラグインでは、Windowsの`C:\filter-matome`と`%LOCALAPPDATA%\NicoCache_nl`、Linux/macOSの標準設定領域を初期値にして、旧`create-all-symlinks.ps1`相当のリンクをGUI・ヘッドレスで安全に作成できます。

導入、ヘッドレス実行、外部プラグインの追加方法、単体・機能・結合・E2Eテストは [`scripts/README.matome-toolbox.md`](scripts/README.matome-toolbox.md) を参照してください。`nicocache-utility.py`と専用READMEは削除済みで、NicoCache_nlの管理操作は本体側の機能を使用します。用途が異なるMkDocs用フックなどは残しています。

### NicoCache_nlの終了・再起動

NicoCache_nlの終了と再起動は、NicoCache_nl本体に付属するGUIまたは標準ランチャーを使用してください。matome-toolboxはリポジトリのリンク作成、メディア処理、設定編集、更新に集中し、NicoCache_nl本体のプロセス管理は行いません。

### nlFilter文法
```ini
[Replace]
Name = フィルター名
URL = 対象URL正規表現
Match<
置換対象テキスト
>
Replace<
置換後テキスト
>

[Script]
Name = スクリプト名
URL = 対象URL正規表現
Append<
挿入するJavaScriptコード
>

[Style]
Name = スタイル名
URL = 対象URL正規表現
Append<
追加するCSSコード
>
```


移動元: `README.md`。

<a id="extra-13"></a>

### ドキュメント開発
```bash
pip install -r requirements-docs.txt
zensical serve
```

画面画像は、起動中のNicoCache_nlを経由して実際のニコニコ動画ページとビルド済みSPAをChromeで開き、匿名の一時ブラウザーセッションから`docs/resources/`と`cover-images/`を更新します。

```powershell
cd local/features
bun run docs:capture
```

撮影後はリポジトリ直下で`python scripts/build-docs.py`を実行し、画像を含むドキュメント全体を確認してください。公開時は`DOCS_BUILD_DATE`を設定すると全ページの先頭に更新日時を表示します。



移動元: `README.md`。

<a id="extra-14"></a>

### リリース作成方法（開発者向け）
```bash

移動元: `README.md`。

## 関連文書

- [利用者向けREADME](README.md)
- [更新と復旧](how-to-update.md)
- [検証結果と未検証範囲](verification.md)
- [変更履歴](CHANGELOG.md)

## 現行ビルドの照合（2026-10-16）

上の移動元AGENTSにある「単一バンドル」は旧説明。現行のscripts/build.tsは軽量features.js、機能別entries、Worker、静的HTMLを一括生成する。READMEから移した説明とbuild.tsのfeatureEntrypointsを正本として確認する。ビルドの実行単位は引き続きlocal/features全体である。

## 依存監査のoverride（2026-10-16）

brace-expansion 5.0.9の既存固定は2026-10-16の監査でDoS脆弱性に該当した。現行は5.0.12へ固定し、package.jsonとbun.lockを同時更新する。上流が安全版を取り込んだ時点で固定の必要性を再評価し、bun auditと全体verifyで確認する。
