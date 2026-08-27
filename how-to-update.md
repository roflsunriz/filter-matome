1. local/features/package.jsonのバージョンを更新する（例：300 -> 301）（特に指示がない場合は基本的にメジャー更新を行うこと）
2. CHANGELOG.mdを更新しチェンジログを記録する（Keep a Changelog形式に従う）。前回のリリースタグからのコミット履歴を全て参照して詳しく記録する。
3. README.mdのlatestバッジのバージョンを更新する
4. 最後にコミットとプッシュを行う
5. git tag "#(version)"
6. git push origin "#(version)" の操作でGithub Actionsが自動でリリースを作成する。タグは`#238`、配布アーカイブはURLフラグメントとの衝突を避けた`filter-matome-238.7z`のように、ファイル名側だけ`#`を除く。

## ドキュメント画像の更新

画面構成や主要な操作導線を変更した場合は、NicoCache_nlを起動してから実ページ撮影を更新する。fixtureの簡略DOMはドキュメント画像に使わず、Chromeの匿名一時セッションでNicoCache_nl経由の実際のニコニコ動画ページとビルド済みSPAを開く。

```powershell
cd local/features
bun run docs:capture
cd ../..
mkdocs build --strict
```

撮影スクリプトはmylist2へ匿名サンプルを一時作成するが、既存のChromeプロフィール、Cookie、IndexedDBは読み込まない。動画取得スケジューラーは保存直前の確認画面までに留める。生成された`docs/resources/common-api-status.png`、`mylist2.png`、`movie-info.png`、`smart-fetcher.png`を目視し、ユーザー名、アイコン、Cookie、秘密情報、キャッシュのローカルパスなどが含まれていないことを確認する。問題がある場合は画像をコミットせず、撮影対象またはマスク範囲を修正して取り直す。

## 公式プレイヤー再生速度ブリッジの追従確認

公式設定またはmlink-video-controllerで変更した再生速度が元へ戻る、公式設定パネルがエラーになる、または101番nlFilterのMatchが外れた場合は、Cookieと認証ヘッダーを保存しないraw CDP captureを取り直す。取得物はGit管理外の`local/features/src/sandbox/official-watch-bundle/`だけへ置き、公式コードを製品bundleへ取り込まない。

```powershell
cd local/features
bun run sandbox:capture-official
bun run sandbox:analyze-playback-rate
bun run sandbox:verify-playback-rate
bun test tests/playback-rate-bridge-nlfilter.test.ts tests/official-playback-rate-bridge.test.ts
bunx playwright test tests/mlink-video-controller-playback-rate.spec.ts
```

Matchを変更する前に`local/features/src/sandbox/playback-rate-bridge.md`へ公式原本のURL、SHA-256、サイズ、一致数、前版との差分、意味上の根拠を追記する。最新captureの全JavaScriptで対象1件・他資産0件、置換後ES Moduleの構文、公式media controllerの内部状態、`timeupdate`・`play`時の動画要素補正、版付きAPIの`get`・`set`を確認する。公式の候補配列、会員判定、保存処理は変更せず、`playbackRate`という語の全面置換へ戻さない。

実環境ではWatchページを`Ctrl+F5`でハード再読み込みし、公式設定の各利用可能速度、キーボードの速度変更、mlinkのスライダー・プリセット・微調整を順に操作する。どちらで変更しても動画要素とmlink表示が追従し、公式設定を再度選べることを確認する。APIがないスタンドアロンvideo-playerではmlinkの直接設定が維持されることも確認する。

ロールバックは101番nlFilterの再生速度同期セクション、`official-playback-rate-bridge.ts`、`nico-video-player.ts`のブリッジ利用を同じ以前の版へ戻し、ビルド後にWatchページをハード再読み込みする。旧`playbackRate`全面置換は公式設定・HLS制御まで壊すため復活させない。

## destroy-adsの追従確認

公式ページや広告資産が更新された場合は、Cookieを持たない隔離Chromeをraw CDP付きで起動し、`local/features/src/destroy-ads/README.md`の対象12ページを再走査する。captureはGit管理外の`local/features/src/sandbox/destroy-ads-captures/`へ置き、クエリー、Cookie、認証ヘッダー、個人識別子を保存しない。

```powershell
cd local/features
bun run sandbox:capture-destroy-ads -- --cdp=http://127.0.0.1:9222
bun run sandbox:analyze-destroy-ads
bun test tests/destroy-ads.test.ts tests/extension-logging.test.ts
```

Matchを変更する前に`local/features/src/destroy-ads/match-history.md`へURL、SHA-256、サイズ、一致数と意味上の根拠を追記する。広告語が含まれるだけの通常機能や、生成class名、表示文言を遮断根拠にしない。`publicUrl.adsResource`は呼び出しを削除せず、ローダー関数を保ったまま`/local/features/dist/ad-stub`へbase URLだけを変更する。Java変更後は対象NicoCache_nlのclass pathで`DestroyAds.java`をコンパイルし、`DestroyAds.class`以外の同名追加classがないことを確認する。実環境ではNicoCache_nlを標準ランチャーで再起動し、`proxy.pac.destroy-ads.bak`が初回PAC変更前の内容を保持していること、主要ページのNetworkで外部広告配信・入札・同期・画像・動画・iframe要求が上流応答を受けないこと、ローカル`ad-stub/assets/js/ads2.js`が200を返すこと、通常の動画、コメント、Watch API、一覧画像が維持されることを確認する。元へ戻す場合はNicoCache_nl停止後に同バックアップを`proxy.pac`へ戻し、`DestroyAds.class`を取り除いてNicoCache_nlとブラウザーを再起動する。

## 公式CommonHeader通知APIの追従確認

CommonHeaderのベル内に`すべて既読`ボタンが出ない、一覧取得や既読化が失敗する、または公式通知一覧の続きが残る場合は、`local/features/src/sandbox/common-header-notification-read-all.md`の公開資産、URL、サイズ、SHA-256を更新し、両資産をメモリー上でde-minifyして`GET /v1/box`、`data.nextUrl`、`PUT /v1/notifications/<通知ID>/read`、必要ヘッダーを再確認する。`POST api.feed.nicovideo.jp/v1/read`は別のフォロー新着タイムライン用なので、ベル通知へ流用しない。

```powershell
cd local/features
bun test tests/common-notification-read-all.test.ts
bunx playwright test tests/common-notification-read-all.spec.ts
```

fixtureは確認できた必要フィールドだけを匿名値で更新し、Cookie、通知本文、ユーザーIDを保存しない。自動テストから実サービスへPUTしない。APIのorigin、path、レスポンス型、ページングが確認できない場合は許可条件を緩めず、全ページ検証前に一部通知だけを既読化しない。ロールバックは`src/common/index.ts`から一括既読起動を外し、`notification-read-all.ts`と専用テスト・fixtureを前のリリースへ戻して全体ビルドを再生成する。

## 原宿風Watch CSSの追従確認

公式Watchの表示が更新され、原宿風表示が公式CSSに負ける、または`104_watch_harajuku_style.txt`のCSS Matchが外れた場合は、Cookieと認証ヘッダーを保存しないraw CDP captureを取り直します。取得物はGit管理外の`local/features/src/sandbox/official-watch-bundle/`だけへ置き、公式CSSを製品bundleへ取り込まないでください。

```powershell
cd local/features
bun run sandbox:capture-official
bun run sandbox:analyze-watch-css
bun test tests/official-watch-css-analysis.test.ts tests/harajuku-style-contract.test.ts
bunx playwright test tests/mlink-video-controller-lifecycle.spec.ts --grep "Harajuku module"
```

`sandbox:analyze-watch-css`は、現行root CSSの上位構造が`reset`、`base`、`tokens`、`recipes`、`utilities`の順であること、layer外が既知のSimpleBar・font-face末尾だけであること、104番適用後に全体が単一の`filter-matome-official` layerへ入り、de-minify後も構文解析できることを検証します。未知のlayerやlayer外ルールが増えた場合はMatchを緩めず、de-minify結果で影響を確認して解析契約とテストを先に更新します。

実環境では`NICO_DATA_ROOT\nlFilters\104_watch_harajuku_style.txt`のシンボリックリンク先を確認してNicoCache_nlを標準ランチャーで再起動し、Watch HTMLのHarajuku stylesheetが公式modulepreloadより前にあること、公式root CSS応答が`@layer filter-matome-official{`で始まることを確認します。Cookieなしの隔離Chromeで公式Watch自体がエラー画面になる場合は、専用DOMの見た目を確認済みとして扱わず、公式layerを再現したPlaywright E2Eでカスケードとモジュール破棄を検証します。

左上の原宿風ニコニコアイコンは`fixed`で画面へ居残らせず、スクロール前後の`getBoundingClientRect().top + scrollY`が一致することを確認します。原宿モジュール有効中はCommonHeaderの公式インライン`sticky`を退避して`relative`へ変更し、無効化後は変更前の値と優先度へ戻ることも確認してください。`sandbox:verify-harajuku-css`は代表ビューポートでこの文書座標を動的検証します。

ロールバックは`104_watch_harajuku_style.txt`とHarajuku CSS生成・active scope変更を同じ以前の版へ戻し、`bun run build`後にNicoCache_nlとブラウザーを再起動します。104だけを外すと現行モジュールがfallback linkを後から追加するため、読込順の保証を失います。

## 公式コメント再取得APIの追従確認

ニコニコ動画の公式資産更新でcomment-filter2の「今すぐ適用」がページ再読み込み確認へ戻った場合は、`local/features/src/sandbox/README.md`の手順で公開視聴ページ資産を再取得します。Cookie、認証ヘッダー、HTMLは保存せず、取得済みES Moduleを実行しないでください。

Matchを変更する前に、`local/features/src/sandbox/comment-reload-match-history.md`へ公式原本のURL、SHA-256、サイズ、Matchと一致数、前版との差分、意味上の根拠を追記します。履歴が3版以上あり、minify名が実際に変化した版を含み、全履歴で対象に1回・他資産に0回だけ一致することを確認できるまでは、識別子を無条件にワイルドカード化しません。

現行Matchはaction、store、additionals、現在状態の識別子をcaptureし、同一storeの`current()`とWatchコメントAPIのserver・動画ID・params・additionalsの関係をbackreferenceで固定します。単語だけのワイルドカードへ緩めず、CommonHeaderの`filter-matome`メニューでも再生速度同期とコメント再取得が`有効`になることを確認します。

```powershell
cd local/features
bun run sandbox:analyze-comment-reload
bun run sandbox:verify-comment-reload
bun test tests/comment-reload-nlfilter.test.ts tests/official-player-bridge.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析が失敗した場合は、最新資産をde-minifyして`POST /v1/threads`の再実行、直前の追加取得条件、成功後の公式ストア更新と描画更新を追跡します。`nlFilters/102_comment_reload_api.txt`は確認できたactionへだけ接続し、ストア本体やWatchデータをグローバルへ公開しません。新しいMatchで解析コマンドとテストが成功しない限り置き換えず、旧Matchが外れた環境では通常再読み込みを自動実行せず、一度だけ必要なハード再読み込み方法を通知します。変更前へ戻す場合は`102_comment_reload_api.txt`だけを以前の版へ戻し、ブラウザーキャッシュを消してWatchページをハード再読み込みします。

## 公式コメント右クリックメニューの追従確認

右クリックメニューからcomment-filter2項目だけが消えた場合は、`local/features/src/sandbox/comment-context-menu.md`に従い、右クリック座標から`getCommentAtOffset()`で公式コメントモデルを取得し、`ExpandedComment`がReact操作項目を生成する経路を再確認します。DOMノード、生成class名、表示文言のセレクターへ切り替えてはいけません。

Matchを変更する前に`comment-context-menu-match-history.md`へ公式原本のURL、SHA-256、サイズ、Matchと一致数、意味上の根拠を追記します。公式minify名の変化を含む3版以上で対象1回・他資産0回を確認するまでは、識別子を無条件にワイルドカード化しません。

現行MatchはReact runtime、button、css、handler、propsをcaptureし、同じruntimeとpropsが直後の`comment.vposMs`表示へ使われる関係を固定します。動的確認では公式コメントメニューを開かず、読込済み`ExpandedComment`資産への自動プローブだけでCommonHeaderのコメントメニュー状態が`自動検査中`から`有効`へ変わることを確認します。プローブは認証情報を送らず、103番固有markerの有無だけを検査します。

```powershell
cd local/features
bun run sandbox:analyze-comment-menu
bun test tests/comment-context-menu-nlfilter.test.ts tests/comment-context-menu-rules.test.ts tests/official-comment-menu.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析は置換後ES Moduleの構文、版付き`getItems/execute`接続、既存の公式NG操作が残ることまで確認します。Matchが外れた場合は公式メニューが無改変で表示され、comment-filter2項目だけが追加されません。変更前へ戻す場合は`103_official_comment_menu.txt`だけを以前の版へ戻し、ブラウザーキャッシュを消してWatchページをハード再読み込みします。

## nlMovieFetcherの追従確認

ニコニコ動画の配信仕様変更へ追従するときは、`local/features/src/api-info/nl-movie-fetcher-api.md` のraw CDP手順で、Watch API、access-rights API、映像・音声分離playlistを再観測します。Java拡張は対象NicoCache_nlのJARをclasspathにして`nlMovieFetcher.java`と`FilterMatomeSmartFetcher.java`を同時にコンパイルし、生成物が同名の2クラスだけであることを確認してください。URL許可や取得処理を変更した場合は署名URLの取得だけで終了せず、公開動画をsmartFetcherから実行し、履歴が`completed`、nlMovieFetcherの`completed`と`total`が一致、`bytesTransferred`が0より大きいことまで確認します。署名クエリー、Cookie、アクセス権キーは検証記録へ残しません。TypeScript側は通常の `bun run verify` でカードDOM、API交渉、スケジューラーSPAを検証します。

smartFetcherの永続形式を変更するときは、`data/filter-matome-smart-fetcher.json`の旧データ復旧、破損退避、再起動時の`running`回収を確認します。Cookieは状態JSONへ混在させず、許可名を`nicosid`、`domand_bid`、`user_session`、`user_session_secure`に限定したまま、AES-GCM暗号文と256ビット鍵を別ファイルへ保存してください。平文Cookie、署名URL、アクセス権キーをテスト出力やログへ含めてはいけません。

## scripts matome-toolboxの更新

`scripts/matome-toolbox` は独立したMavenプロジェクトです。リリースワークフローがJDK 17で`mvn verify`を実行し、生成したJARを配布アーカイブへ同梱します。変更時はローカルでも次を実行し、4層の自動テスト、GUI起動、`--list-plugins`、`--headless --self-test`の順に確認します。

旧名称の既定データディレクトリ`~/.filter-matome-toolbox`があり、`~/.matome-toolbox`がまだない場合は、初回起動時に設定、プラグイン、ログを新しいディレクトリへ自動移行します。`--data-dir`を明示した場合は指定先をそのまま使用します。

```bash
cd scripts/matome-toolbox
mvn --batch-mode verify
java -jar target/matome-toolbox-0.1.0-SNAPSHOT.jar --list-plugins
java -jar target/matome-toolbox-0.1.0-SNAPSHOT.jar --headless --self-test --data-dir ./toolbox-data
```

GUIを表示できないCIやサーバーではGUI E2Eだけスキップされます。CLI E2E、組み込みプラグイン、外部プラグインSPI、ローカルHTTPによるETag更新テストはヘッドレスで実行されます。

matome-toolboxのE2Eは、`@TempDir`配下にデータディレクトリ、リポジトリ、ユーザーホームを作る隔離フィクスチャです。ffmpeg/ffprobeなどの外部コマンドは偽実装、更新APIと動画タイトルAPIはlocalhostのHTTPサーバーへ差し替えるため、実機の設定、証明書ストア、Windowsレジストリ、Firefoxプロファイル、外部GitHubへ接続しません。メディア、設定編集、更新、開発者向け操作を同じ隔離環境で確認し、OSにシンボリックリンク作成権限がない場合も安全な拒否と既存通常ファイルの保護を検証します。

変換や設定編集を行う場合は、対象パスを明示し、最初に`--dry-run`で予定を確認してください。失敗時はアプリデータディレクトリの設定バックアップと、各処理の`.bak-*`／`.part`を確認して復旧します。NicoCache_nl本体の管理操作は本体側の案内に従ってください。

リリースアーカイブ作成時は、`scripts/matome-toolbox/target`の開発用生成物を除去し、実行JARだけを同じパスへコピーします。配布物の検証では、アーカイブ内のJARが存在し、`--list-plugins`と`--headless --self-test`を実行できることを確認します。
