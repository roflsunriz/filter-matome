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
- `extensions/` には NicoCache_nl 用の拡張機能があります。これはNicoCache_nlで使用される拡張機能です。ビルドするには NicoCache_nl のソースコードが必要です。このワークスペースにはないのでコンパイルできません。

## その他の制約
- 視聴ページのNicoCache_nl APIには過度に依存しない。フォールバックとして使用するのは構わないが、第一の選択肢にはしない。
- 視聴ページのNicoCache_nl APIはローカルプロキシーソフトウェアNicoCache_nlが提供するAPI（具体的にはNicoCache_nl\local\nllib_watch.jsが提供している）である。ニコニコ動画側の構造変更によって壊れるリスクがある。そしてすぐ追従できないリスクもある。
- 基本的にこのリポジトリの成果物はシンボリックリンクで繋げられている(C:\filter-matome <-> C:\NicoCache_nl間) 例えばC:\filter-matome\nlFilters\100_features.txtはC:\NicoCache_nl\nlFilters\100_features.txtとしてシンボリックリンクを設置してある。
- C:\NicoCache_nl\localに置いたファイルは https://www.nicovideo.jp/local に配信される。
- NicoCache_nlのAPIは https://www.nicovideo.jp/cache にあることが多い。/cache/info/v2 など（ソースコードを読めば理解可能）
- NicoCache_nlのソースコードはC:\NicoCache_nl\srcにあるが、他の開発者（わたし以外のメンテナーの方）により定期的に上書きされるため直接の変更は推奨しない。C:\NicoCache_nlのルートにオーバーレイJavaソースコードを作って対応すること。
- NicoCache_nlのソースコードの変更がどうしても必要なときはオーバーレイソースコードと共に正式に修正を取り込んでもらうようにお願いするので依頼文も日本語で考えること。
- C:\NicoCache_nl\ajax-rm-domand-cache-resetフォルダはオーバーレイソースコードのひとつ。
- オーバーレイソースコードは状況によっては消去してあることもある（ソースコードに正式に修正が取り込まれた場合など）
- C:\NicoCache_nl\build-ajax-rm-domand-cache-reset.ps1はオーバーレイビルド用スクリプト。（依存が少ない）
- C:\NicoCache_nl\build-ant.ps1（antに依存）とbuild-javac.ps1（manifest-nl.mfに依存）は通常ビルド用スクリプト。
- NicoCache_nl実行用のスクリプトはC:\NicoCache_nl\RunNicoCache.ps1またはNicoCache_nl Starter.bat
- NicoCache_nlのデバッグをするときはC:\NicoCache_nl\NicoCacheGUI.propertyのDebugMode=falseをTrueに変えてNicoCache_nlを再起動すると、debug.logが出力される。
- NicoCache_nlを再起動するときはjava.exeまたはjavaw.exeを強制終了して上記実行用スクリプトを起動する。

## ローカルプロキシーソフトウェアNicoCache_nlの実行フォルダの基本的構造
- .externalToolBuilders - 不明。Antビルダー用らしい？
- .settings - エディタの設定
- cache - ニコニコ動画を視聴すると作成されるHLSキャッシュが保存されている
- certs - genCerts.bat/shで作成される証明書の秘密情報
- cvcache - 不明。証明書関連と推測
- data - corsとtlsclient関連
- defaults - config.propertiesに未設定の値が自動参照・自動使用されるデフォルト設定。NicoCache_nlに設定可能な値が全て収納されている
- documents - 人間用READMEをまとめたフォルダ
- extensions - NicoCache_nl用Java拡張機能。このリポジトリのextensionsフォルダ.classファイルのシンボリックリンクも設置されている。
- lib - BouncyCastleライブラリが格納されていて、証明書作成などに使用されている。
- link - Webページのショートカットリンク。
- list - NGtitle.txtというファイルがあるのみ
- local - ニコニコ動画のWebページの埋め込みに直接使用されるフォルダ。https://www.nicovideo.jp/local として配信されている。local/hoge.txtとして置くとhttps://www.nicovideo.jp/local/hoge.txt として配信される。
- nlFilters - 独自のDSL言語によってHTML要素やJavascript/CSS/画像などを特定のニコニコ動画のページに埋め込むことが可能
- others - ショートカットリンクその2
- scripts - C:\filter-matome\scriptsからのシンボリックリンク
- src - NicoCache_nl.jarのソースコード
- thcache - 動画サムネイルのキャッシュ
- .classpath - classpathファイル
- build.xml - ビルド設定
- Changelog.txt - メンテナーが記録したチェンジログ
- config.properties - NicoCache_nlの設定ファイル
- genCerts.bat/genCerts.sh - 証明書生成
- how-to-dump-stack-trace.txt - スタックトレースの取り方
- manifest-nl.mf - ビルドマニフェスト
- NicoCache_nl Starter.bat - GUI起動用(タスクトレイ常駐)
- NicoCache_nl.bat/NicoCache_nl.sh - コンソール起動
- NicoCache_nl.jar - プロキシ実行本体
- NicoCache_nl.jar.sig - シグネチャー
- NicoCacheCA.jar - 証明書関連と推測
- NicoCacheCA.jar.sig - シグネチャー
- NicoCacheGUI.property - GUI設定ファイル
- NicoCacheGUI_native.dll/NicoCacheGUI_native64.dll - GUI用のファイル
- nico-cache-gui-launcher.bat/nico-cache-nl-starter.bat - GUI/コンソール用の起動スクリプト。シンボリックリンク。
- niconico-0.ico - アイコン。
- nlFilter_sys.txt - システムnlFilter
- proxy.pac - プロキシの設定ファイル
- Readme.txt/Readme_dms.txt/変更点.txt - 人間用ドキュメント