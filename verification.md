# 検証手順

## #257 原宿風WatchのSPA再入場（2026-10-19）

Issue #26の条件を、公式Watch相当のDOMを使うChromium fixtureで再現した。修正前は、SPA再初期化中の後続要求が`isReinitializing`で破棄される経路と、非Watchで`destroy()`された原宿風モジュールの同一instanceがWatchへ戻ってもactiveへ復帰しない経路があった。

再初期化要求を処理中も保留し、現在の処理完了後に最新DOMでもう一度実行するよう変更した。原宿風モジュールは遷移ごとに旧Observer、ResizeObserver、再試行timer、CommonHeader位置、追加DOM、layout変数を破棄して再構築する。動画メタデータ取得には世代番号を持たせ、古い遷移の非同期結果を新しい動画へ反映しない。モジュール初期化中に対象ページを離れた場合は、ModuleManagerへ古いinstanceを登録しない。

回帰テストでは`/watch/sm9`から`/ranking`へSPA離脱し、原宿DOMとactive属性が消えることを確認した。その後、同じinstanceで`/watch/sm10`へ再入場し、active属性、原宿chrome、更新後の説明文、投稿者名が1件ずつ復帰することを確認した。通常幅・狭幅、長短の説明、全画面、共通パネル、テーマ、背景優先、破棄の既存検査も同じテストで維持した。

公開前検証は次のとおり。

| 検証 | 結果 |
| --- | --- |
| `bun run verify` | format、ESLint、型検査、単体267件、Chromium E2E 92件、39ファイルのbuildが合格 |
| 原宿風の対象テスト | lifecycle、CSS契約、release workflow、SPA共通監視、1000行上限が合格 |
| `mvn --batch-mode verify` | matome-toolbox 33件、JAR生成が合格 |
| `python scripts/build-docs.py` | Zensical 0.0.69のstrict buildが合格 |
| 依存監査 | `bun audit`は106パッケージ、`pip-audit -r requirements-docs.txt`、GitHub Dependabot alertはいずれも既知脆弱性0件 |
| 更新確認 | DOMPurify 3.4.17、Playwright 1.64.1、ESLint 10.13.0、typescript-eslint 8.71.2へ更新。TypeScript 7.0.2は既知の非互換のため6.0.3を維持 |

package版、READMEのlatestバッジ、104番フィルターとモジュール側のstylesheet URLを257へ同期した。実利用FirefoxプロフィールとNicoCache_nl経由の公開Watchでの手動SPA操作はローカル自動検証に含めず、公開後の通常利用経路で追加確認する。fixtureだけの合格を実プロフィール確認済みとは扱わない。

## 2026-10-19: CI高速化

- 変更したGitHub Actionsをactionlint 1.7.12で検査し、エラー0件を確認した。
- GitHub上の未解決Dependabot更新PRと依存脆弱性アラートがともに0件であることを確認した。

## Zensical 文書移行（2026-09-27）

`python -m pip install -r requirements-docs.txt` 後、`python scripts/build-docs.py` を実行する。`DOCS_BUILD_DATE` を設定した場合は `.mkdocs-build/site/index.html` など全ページの先頭に更新日時が入り、未設定時は入らないことを確認する。`docs/` の原本は変更されない。Pages デプロイ後は公開ページと Actions の結果を確認する。

2026-09-27 のローカル検証では Zensical 0.0.65 の strict ビルドが成功し、Markdown 5 ページに対応する HTML 5 ページと 404 ページを生成した。`DOCS_BUILD_DATE` 設定時の先頭表示を確認した。`mvn --batch-mode --quiet verify` と `pip-audit -r requirements-docs.txt` も成功した。Pages 実配信は未検証。

## #256 原宿風Watch共通パネル（2026-09-27）

Chrome CDP 9222でNicoCache_nl経由の公開Watch `sm9` を開いた。修正前は公式ギフトパネルにインライン`position: fixed; left: 225px; top: -628px`が設定され、旧CSSの通常宣言より優先されていた。ページスクロール600pxでパネルのY座標が-628から-28へ移動することを再現した。生成済みCSSを再ビルドしても旧URLの読込済みstylesheetには旧規則が残ったため、104番とモジュールのURLを`?v=256`へ同期した。

修正版は通常のWatch再読み込みから`/local/features/dist/watch-harajuku.css?v=256`を読み、原宿モジュールがactiveであることを確認した。ギフト・動画プレーヤー設定・タグ編集を実際のボタンから開き、スクロール前後の矩形をCDPで測定した。

| 画面 | パネルの矩形 | スクロール後 | 内容 |
| --- | --- | --- | --- |
| 1280×720 | x=857, y=48, 幅384, 高さ607 | 同じ矩形 | 設定は807pxの内容を550pxの内部スクロール領域に収容 |
| 784×505 | x=433, y=48, 幅320, 高さ449 | 同じ矩形 | 設定は814pxの内容を392pxの内部スクロール領域に収容 |
| 390×650 | x=43, y=48, 幅320, 高さ594 | 同じ矩形 | 設定は814pxの内容を537pxの内部スクロール領域に収容 |

タグ編集も各画面で同じ固定座標と内部スクロールを確認した。NG設定とマイリスト追加は匿名Watchの操作導線から開けなかったため、実ページでの確認は残る。両者を含む5種類の共通セレクターは`mlink-video-controller-lifecycle.spec.ts`のDOM回帰テストで通常幅・狭幅、スクロール前後、全画面の設定除外を確認する。単独の`roflsunriz/harajuku`についてはUserCSSとUserScriptをCDPで一時適用し、784×505でギフト・設定・タグ編集の座標がスクロール前後で同一と確認した。管理拡張での常用プロファイルは未確認。

隔離検証用`bun run sandbox:verify-harajuku-css`は公式ES Moduleの一件が`ERR_SSL_PROTOCOL_ERROR`で読めず、公式Watchの初期化前に停止した。通常CDPタブでの実配信測定とChromium回帰テストを代替とし、この失敗を成功扱いしない。再現時はTLS経路を確認したうえで同スクリプトを再実行する。

`bun run verify`はformat、lint、型チェック、全単体テスト、Chromium E2E 92件、39ファイルの全体ビルドを通過した。`mkdocs build --strict`と`bun install --frozen-lockfile`も成功し、`bun audit`は106パッケージで脆弱性0件。Playwright 1.63.0への更新直後は対応するChromiumがなくE2Eが起動前に失敗したため、公式の`playwright install chromium`を実行して全体検証をやり直した。TypeScript 7.0.2はtypescript-eslint 8.70.1とsandboxのTypeScript解析APIに非互換だったため6.0.2へ戻した。`bun outdated`で残る更新候補はTypeScript 7だけ。

## #255の公開前確認（2026-09-13）

最新公開版`#254`からの5コミットと実差分を確認し、全編先読み・A-Bリピート・公式時計同期・画質ID照合・操作パネル・文書の変更をCHANGELOGの`#255`節へ整理した。package.jsonの版番号とREADMEのlatestバッジは255へ同期し、CONTRIBUTINGの配布形式を実際の7zアーカイブと公開手順へ訂正した。

`bun install --frozen-lockfile`は依存変更なし、`bun audit`は100パッケージ・脆弱性0件。format、lint、型チェック、全単体267件、Chromium E2E92件、39ファイルの全体ビルド、MkDocs strictが合格した。Windowsでは前節と同じ理由で、testのみ`bun --bun run test`を使った。実Firefoxの検証結果と既存キャッシュを使った範囲は次節を参照する。

公開はmainのCI・Docs成功後に検証済みコミットへ新規タグ`#255`を付ける。Releaseワークフロー完了後、公開タグ・CHANGELOG抜粋・配布物の必須ファイルとSHA-256を照合する。既存タグの付け替えはしない。

## 全編先読みの容量制限・A-Bの公式時計ずれ（2026-09-13）

報告条件は`sm45650421`、360p/192k、Firefox。前回は短い公開動画の要素時刻だけを確認し、公式の独立した時計と容量を超える取得を検証できていなかった。

全編先読みはAPI v2の取得計画を使い、両playlistを先に取得してから同時2要求以内で応答をストリーム消費する方式へ変更した。再生用バッファーの上限と読込位置を変更せず、同じ品質のNicoCache_nl完成キャッシュを確認して100%とする。A-Bと通常のシーク・再生/停止は、API v1の公式mediaへ接続し、シーク開始→確定と保留位置の表示を維持する。

| 検証 | 結果 |
| --- | --- |
| 全体単体テスト | 267件合格。192MiB相当のストリーム消費、取得中止、別品質の完成除外、実寸法と品質IDの不一致、品質接尾辞、公式時計の下限、非同期シーク、プレビュー除外を含む |
| 全体Chromium E2E | 92件合格 |
| 認証状態のないFirefox E2E | 22件合格。A-B・時刻入力・終端・再接続・ローカル再生・先読み・API表示・狭幅/RTL |
| 世代比較 | 6ビルド・8資産で両APIのMatchが各1回、対象外526資産で0回。構文・HLS計画・公式時計の参照関係を確認 |
| 公開動画sm9の実配信 | 360p/128kの完成キャッシュ100%、100秒で一時停止維持、公式時計と要素時刻がともに100秒へ戻ること、両APIの自動activeを確認 |
| A-Bの細かい観測 | 50ms間隔100点を測定。95点は確定済みで時刻差0.3秒以内、5点は公式のシーク保留中。保留位置はAであり1秒以内に確定し、停止後も両時計が揃うことを確認 |
| 指定動画・実利用Firefox | ユーザーが起動したFirefox 155.0.1の実プロフィール、sm45650421、360p/192kで確認。485.625秒・48,860,107 bytesの完成キャッシュを100%表示し、100秒・一時停止を維持。再生用バッファーは`[0,282]`で全編保持を要求しない。全6 APIが自動active |
| 指定動画のA-B | 100～101秒を50ms間隔400点、120.5～123.5秒を200点測定。合計22回の折り返し。確定済み571点の最大時計差は0.161秒未満で蓄積なし、区間外0件。前者の保留シークは最大104msで確定。現在位置設定・一時停止維持・解除・クリア・通常10秒戻しも確認 |

シーク中は公式の表示が先に保留位置Aへ変わり、旧フレームが短時間残る。これを確定後の時計ずれと混同しないよう、実測スクリプトは`seeking`を記録し、保留時間・Aへの確定・確定後の差を検査する。元の不具合である「シークしていないのに公式時計が旧位置に残る」状態は、この検査でも失敗する。

旧操作を再現した実測では、要素を100秒へ戻しても公式時計が約231秒に残った。公式の確定だけを呼ぶ方法も途中のtickで戻り得たため、開始→確定の順序と公式getterの既定の保留位置を利用する形に直した。詳細は`local/features/src/sandbox/playback-control-bridge.md`と`full-buffer-bridge.md`を参照する。

実プロフィールでの追加検証により、360p配信でも実際の映像は354pxであり、`height`を品質名にした実装が完成キャッシュを見落として99%で失敗することを再現した。NicoCache_nlの`DomandCVIEntry`とplaylist判定に合わせ、公式品質IDから映像の品質部を取り出す。`-lowest/-low/-mid`を保持し、音声の`-hr`も処理する。修正前に354p対360pで失敗するテストを確認し、修正後に全体テストと6ビルドの解析が合格した。APIは同じv2の返却値修正であり、CommonHeaderの版・必須メソッド・副作用のないプローブ契約は維持し、関連単体・E2Eと実ページの自動activeを再確認した。

Firefoxでは同じ公式資産URLでも`script`の旧本文（decodedBodySize: 1,401,434 bytes）が残り、`fetch(cache: reload)`だけが新本文（1,401,561 bytes）を取得した。通常・強制再読み込みと同じプロフィールでの再起動では更新されなかったため、検証タブの`cacheDisabled`を一時的に有効にして再取得した。その後`false`へ戻して通常再読み込みし、実APIの`videoMode: 360p`と上記の機能を測定した。Service Workerの制御はなく、手動のAPI差し替え・features注入・認証情報の抽出はしていない。再取得だけの成功を通常配信の成功として扱わない。

指定品質は検証開始時点で既に完成キャッシュがあったため、既存キャッシュを削除して未取得状態を作る試験はしていない。修正前の実機では取得計画のストリーム消費後に品質不一致で99%となる経路を確認し、容量を超える取得・中止・未完成からの100%判定は192MiBの単体とブラウザーfixtureで検証した。

format、lint、型チェック、全体ビルド（39ファイル）、MkDocs strictが合格。匿名の実ページから更新した操作画像は維持し、実プロフィールの画面画像や認証情報を文書へ持ち込まない。再生用バッファー保持とNicoCache_nlの取得完了を説明で区別し、API版・操作・更新・復旧の文書を同期した。

```powershell
cd local/features
bun run format
bun run lint
bun run type-check
bun --bun run test
bun run build
bun run sandbox:analyze-full-buffer
bun run sandbox:analyze-playback-control
bun scripts/sandbox/verify-current-playback-tools.ts --cdp=http://127.0.0.1:9237 --samples=100 --interval=50
bun scripts/sandbox/verify-current-api-status-menu.ts --cdp=http://127.0.0.1:9237
```

WindowsのPlaywright実行ファイルshim停止は前回と同じため、同じpackage.json定義を`bun --bun run test`で実行した。Firefox E2Eのブラウザー生成は新規・未認証プロフィールを使い、Windowsのプロセス制約を避けて昇格実行した。実プロフィールは、ユーザーによる起動通知を受けて許可されたFirefoxへ接続し、専用タブで検証した。既存Chromeの認証状態を使う以前の試行は自動承認審査に拒否されたため実行せず、今回も利用していない。

最終の通常再読み込みでも360p/192kと全6 APIのactiveを維持し、A/B空欄・リピートOFF・進捗0へリセットされた。1366×683の実画面でパネル全体が画面内に収まることもDOMで確認した。検証タブを閉じ、ユーザー指定ランチャーで検証用Firefoxを終了した。一時設定の復元と`Fix-FirefoxHomePrefs.ps1`の実行完了、Firefoxプロセス0件・デバッグ状態ファイル削除を確認した。

## mlinkの全編先読み・A-Bリピート（2026-09-12）

再生タブに2機能を追加した。101番の全編先読みAPIとCommonHeaderの自動検査を同時に接続し、A-Bリピートは標準の動画要素へ接続する。設定はこの動画の間だけ保持し、SPA・再接続・破棄で解除する。

| 検証対象 | 結果 |
| --- | --- |
| 公式HLSの世代比較 | 6ビルド・8資産でMatch各1回、対象外526資産で0回、置換後構文合格。同一URLの変更済みコピーは別世代に数えず、HLS session本文は5種類 |
| API・進捗・時刻の単体確認を含む全単体テスト | 260件合格 |
| 既存機能を含むChromium E2E | 91件合格 |
| Firefox 153.0の再生操作・APIメニューE2E | 21件合格。利用者の通常プロフィールを使わない分離環境 |
| 実Chrome 153.0.8010.36 / NicoCache_nl | 途中再生230秒から、100秒・一時停止を保って全編100%。100～101秒の反復、解除、全5 APIの自動active、通常再読み込みでのリセットを確認 |
| 実Firefox 153.0 / NicoCache_nl | 全編`[0, 320.086433]`、100秒・一時停止維持、100～101秒の反復、全編先読みAPIの自動activeを確認 |
| 実ページのサイズ | 360×800、800×600、600×360、1920×1080でパネルとクリア操作が画面内。日本語・英語・RTLの入力/ボタン幅はE2Eでも確認 |

format、lint、型チェック、全体ビルド、`mkdocs build --strict`が合格。`docs/resources/mlink-playback-tools.png`は匿名の実Watchから撮影し、説明・両方の時刻・操作ボタンが切れないことを目視した。操作説明、更新・復旧、API契約文書を同時に更新した。

Material for MkDocsの2.0非互換性の予告も[公式案内](https://squidfunk.github.io/mkdocs-material/blog/2026/02/18/mkdocs-2.0/)と照合した。現行の`requirements-docs.txt`は既に`mkdocs>=1.6,<2.0`を指定し、CIも同じ定義を使うため、2.0への自動更新は防止済み。警告を抑制する設定は追加していない。

```powershell
cd local/features
bun run format
bun run lint
bun run type-check
bun run test
bun run build
bun run sandbox:analyze-full-buffer
bun run sandbox:verify-playback-tools
bun run sandbox:verify-api-status-menu
```

この端末のBun 1.4.0では、通常の`bun run test`が単体テスト完了後のPlaywright実行ファイルshimで進まなかったため停止し、`bun --bun run test`で同じpackage.json定義の全単体・全E2Eを完走した。テストの除外・期待値の緩和は行っていない。FirefoxはWindows sandbox内でページ生成に失敗したため、分離ブラウザーの同じ21テストを昇格実行して合格した。

容量超過と致命的ネットワークエラーはフェイクHLSで検証し、物理メモリー不足を実機で意図的に発生させる試験は実施していない。会員固有の有料/PPV動画と利用者のFirefoxプロフィールは未検証。通常の認可・画質・プロキシー設定を変更せず、公開動画での実配信と境界テストを組み合わせた。原本とcaptureの区別、取得時刻・ハッシュ・現行CDN照合は`local/features/src/sandbox/full-buffer-bridge.md`に記録した。

開始・完了時の文書確認で不足していた`CODE_OF_CONDUCT.md`、`SECURITY.md`、`SUPPORT.md`を整備し、CONTRIBUTINGのBun固定値をpackage.jsonへの参照へ修正した。既存の同等文書がないことと、文書内の相対リンク先の存在を確認した。

## 公式資産APIの変更契約

2026-09-06。ローカル`AGENTS.md`へ、sandboxの最低3世代と各変種による汎化検証、
CommonHeaderのAPIタブと自動プローブの追加・編集・削除を同期する必須契約を追加した。
既存のsandbox契約文書、`api-status-menu.ts`、API状態メニューの単体・E2Eテスト、
`how-to-update.md`と照合し、通知更新の`refresh()`を自動プローブから呼ばない制約も維持した。
`git diff --check`で差分を確認し、`local/features`の`bun audit`は100パッケージ・脆弱性0件。
今回は規約と記録だけの変更で、実装・依存関係・配信物は変更しないため、アプリの全体ビルドとブラウザー検証は実行していない。

## お知らせの一括既読と表示更新

2026-09-05。100番の通知表示更新APIを通し、一括既読後にパネルを開いたまま公式一覧を再取得する。
API一覧には通知表示更新を加え、プローブから`refresh()`を呼ばない。

```powershell
cd local/features
bun test tests/common-notification-read-all.test.ts tests/common-notification-refresh.test.ts
bunx playwright test tests/common-notification-read-all.spec.ts tests/common-api-status-menu.spec.ts
bun scripts/sandbox/verify-notification-refresh.ts --cdp=http://127.0.0.1:9222
bun run verify
```

世代比較は既存sandboxの3.12.0・3.13.0を基点に3.11.0を加え、PC/responsive計6資産でMatchが各1回、その他470資産で0回。
全6資産の置換後構文とChromeの公式DOMで、全成功・部分失敗・処理中のパネル閉鎖を検証した。
全成功と成功分だけが700/白から400/灰へ変わり、パネルは維持される。閉じたパネルは復活しない。
詳細なURL・ハッシュ・世代ごとの関数名・境界の根拠は
`local/features/src/sandbox/common-header-notification-read-all.md`に記録した。

実際のNicoCache_nl配信もPC/responsiveともAPI挿入済みを確認した。
ビルド後の匿名の`https://www.nicovideo.jp/video_top`でも、通常のキャッシュ経路・手動コード注入なしで、
API版1、`refresh`関数、API一覧の通知表示更新が`active`へ自動反映されることを確認した。
通常のキャッシュを更新するため、利用開始時に一度ページを`Ctrl+F5`で再読み込みする。
利用者のFirefoxプロフィールと実通知への書き込みは未検証。匿名fixtureから実サービスへのPUTは行わない。

2026-09-05の全体検証はformat、lint、型チェック、単体249件、Playwright 82件、全体ビルドが合格。
`mkdocs build --strict`も合格した。

同日の#254公開前検査では`bun audit`で検出した開発用の`@humanfs/node`を0.16.8へ更新し、
再検査は100パッケージ・脆弱性0件となった。直接依存は増やさず、必要な間接依存だけを更新した。

## CommonHeader API状態メニューの挿入順

公式CommonHeaderのReactルート生成前にfilter-matomeメニューを追加せず、生成後はログイン・
非ログインとも`NicoCache → filter-matome → アカウント`の順で表示されることを確認します。

```powershell
cd local/features
bunx playwright test tests/common-api-status-menu.spec.ts
bun run verify
```

Playwrightでは、空の`#CommonHeader`だけが存在する状態でAPI状態メニューとstyleが作成されず、
公式ルートを後から追加するとメニューが`document.body`へ固定配置されることを確認します。
非ログインfixtureでは会員登録URLの直後にあるアカウントプレースホルダーを基準にします。
480pxのfixtureでは公式アカウント項目を画面外へ移動し、NicoCacheとfilter-matomeの順序を保って
両メニューがビューポート内へクランプされることを確認します。

実ページではブラウザーキャッシュとService Workerを迂回してトップ、静画、生放送、チャンネル、
大百科、実況、Nアニメ、ブロマガ、コモンズ、NicoFT、ニコニコQ、ニコニ貢献、ニコニ立体、
ニュース、ニコニコ広場をハード再読み込みします。ページへJavaScriptを手動評価せず、
`features.js`と`05_nicocache_menu.js`の自動読込、公式`.nico-CommonHeaderRoot`、両メニューの
`account`配置、ログイン・非ログイン時の座標順をそれぞれ確認します。

2026-08-31にはログイン済みChromeでトップと動画トップを分けた16URLを測定し、両script、
両メニュー、`NicoCache → filter-matome`の座標順を確認しました。公式PC・responsiveに加え、
実況の旧36pxヘッダー、NicoFT、広場の独自44pxヘッダーを800pxでも画面内に収めます。
トップは通常のキャッシュ・Service Worker経路で維持し、公式アカウント要素の計算済み
`margin-left`が`0px`、旧予約属性が0件であることを確認します。公式右側flex列の全可視要素を
DOM順に測り、通知群、NicoCache、filter-matome、アカウントが隣接して重ならないこと、空の
`#CommonHeader`が併存しても別ホストの公式ルートへ両メニューが生成されることを確認します。

## ドキュメント画面画像

匿名の一時ChromeセッションからGitHubの公開ページ、現行の実ページ、ビルド済みSPAを撮影します。

```powershell
cd local/features
bun run docs:capture
cd ../..
mkdocs build --strict
```

`docs/resources/`と`cover-images/`の生成画像を目視し、GitHubのIssue導線、comment-filter2、mlink-video-controller、背景画像設定、watch-history、mylist2、movie-info、movie-fetcher、video-player、CommonHeaderが現在の画面構成と一致することを確認します。注釈画像は赤い枠・矢印・ラベルが対象要素を指し、矢印の線と先端が対象枠の内側へ入らず、ラベル同士や操作対象と読めない状態で重なっていないことも確認します。あわせて、ユーザー名、アイコン、Cookie、秘密情報、ローカルキャッシュパスなど、匿名サンプル以外の情報が写っていないことを確認します。

## Harajuku・CommonHeaderの全画面表示

対象は、原宿風Watchを有効にした公式Watchページの動画プレーヤー設定パネルと、CommonHeaderのfilter-matome API状態メニューです。

```powershell
cd local/features
bun test tests/harajuku-style-contract.test.ts tests/common-api-status-menu.test.ts
bunx playwright test tests/common-api-status-menu.spec.ts tests/mlink-video-controller-lifecycle.spec.ts
bun run verify
```

Playwrightでは、公式Watchと同じ`data-styling-name="fullscreen-target"`がビューポート全面の`position: fixed`へ切り替わる状態を再現します。全画面中は動画プレーヤー設定パネルに`data-filter-matome-harajuku-style-exempt="fullscreen-settings"`が付き、API状態メニューが閉じて非表示になることを確認します。全画面解除後は除外属性が消え、API状態メニューが`NicoCache → filter-matome → アカウント`の配置へ戻ることも確認します。

実ページで確認する場合は、原宿風Watchを有効にして動画プレーヤーを全画面表示し、設定ボタンから公式パネルを開きます。設定パネルが公式の全画面用配置・寸法を保ち、filter-matome API状態メニューが表示されないことを確認します。全画面を解除した後は、設定パネルとAPI状態メニューが通常表示へ戻ることを確認します。

問題が再発した場合は、公式Watchの`fullscreen-target`と`watch-floating-panel`の安定属性、全画面時の矩形・`position`、公式バンドルの変更をCookieなしの隔離captureで再確認します。表示文言やハッシュ付きclass名を代替セレクターに使わず、確認できたDOM契約と回帰テストを先に更新します。

## Dependabot 自動処理（2026-09-23）

詳細は [findings.md](findings.md#verification-1) に移しました。

## 2026-10-05: GitHub受付・READMEの整備（公開前）

- 比較元: `d338910358f9d808952fe3b5def209b56c272de1`（`main`）。
- 受付フォーム 2 件のYAML構造、重複キー・ID、入力型、選択肢、予約ファイル名を一括検査し、エラー0件。
- 既存の固有質問・入力例・必須条件を原文と照合。READMEのリンク・画像・コマンド・条件を確認し、裏付けがある誤記だけを訂正した。
- 既存のCI、Dependabot、labeler、ライセンスのファイル内容は比較元から変更していない。
- 製品のビルド・インストール・実機操作、GitHub上のフォーム表示、公開後CIは今回の静的検証に含めない。公開後に実際の受付表示と必要ラベルの適用を確認する。

## 2026-10-16: findings.mdへの知見分離

- 目的: 共通指針に合わせ、AGENTSの行動指示と利用者向けREADMEから、開発内部の実現手段・例外の条件・再利用する調査知見をfindings.mdへ分離した。移動した本文の条件・確認日・未検証の留保を保持した。
- 元文書との本文照合、Markdownの相対リンク・見出しアンカーの検査、git diff --checkを実施し、新たなリンク不整合と空白エラーは0件。AGENTSの一般的な指示は内容を保って再編し、findings全文必読・禁止と承認条件を確認した。
- GitHubの既存Dependabot警告を読み取り、Open PRも確認した（作業開始時Open PR 0件、Open警告 0件）。GitHubの警告なしを全依存の安全保証や実機動作の検証とは扱わない。
- 追跡中のrequirementsファイルをpip-auditで検査し、いずれも既知の脆弱性0件だった。固定されたツールと依存範囲を変更していない。
- ローカルbun auditは既存brace-expansion 5.0.9のDoS脆弱性を検出した。既存overrideを5.0.12へ上げる最小修復とその品質検証は、文書分離とは別の修復として記録する。文書を分離したことを監査成功の理由にしない。
- 文書移動と参照整理では製品の実行時ロジックを変更していない。実機書換え、認証操作、外部サービスへの投稿・署名・リリースは実施せず、これらの動作が再検証済みであるとは扱わない。

## 2026-10-16: brace-expansionの依存監査修復

- push前のbun auditが既存override 5.0.9にGHSA-qhr7-859c-m2p7、GHSA-6j4f-fj2g-mc7p、GHSA-q2hr-2g5m-vwhrを検出したため、既存overrideだけを5.0.12へ更新してbun install --ignore-scriptsからlockfileを再生成した。依存設定2行・lock4行の差分で、製品ソースは変更していない。
- 修復後のbun auditは106パッケージで既知の脆弱性0件。bun run verifyはformat・lint・型検査・単体267件・Playwright92件・39ファイルのbuildがすべて成功した。最初の書式検査でpackage.jsonが失敗したため、既存Prettierで整形してから全体を再検証した。
- ブラウザテストは既存のfixtureによる検証であり、実利用プロファイルやNicoCache_nlの設定・データを変更していない。

## 2026-10-20: Dependabot 月末一括処理

- `.github/dependabot.yml` は毎月28日00:00、`.github/workflows/dependabot-automation.yml` は同日18:00（いずれも `Asia/Tokyo`）に設定した。呼び出し先は検証済み共通 workflow の固定 SHA とし、現在の head SHA、Dependabot の資格状態、全 PR チェック成功を merge 前に再確認する。
- YAML 構文、変更差分、空白エラーをローカルで検査した。実際の月末 schedule と Dependabot PR の merge 経路は、次回の毎月28日実行で確認する。

## 2026-10-22: 利用者向け操作画像の追加

- Playwrightの匿名一時ChromeからGitHubの公開リポジトリ、Issue一覧、サインイン画面を開き、`Issues`、`Search issues`、`New issue`、サインイン欄のDOM矩形を基準に赤い枠・矢印・日本語ラベルを生成した。3枚を目視し、矢印の線と先端が対象枠の外側で止まること、指示先、文字の可読性、個人情報・認証情報が含まれないことを確認した。Issueの作成・編集・送信は行っていない。
- NicoCache_nl経由のmylist2は、匿名の一時IndexedDBへ作成したマイリストを使い、初回作成欄と設定ボタン、動画ID欄、追加ボタン、エクスポート位置を示す2枚を生成した。矢印を対象枠の外側へ移し、注釈の重なりを修正後に目視した。動画情報APIが`OFFLINE`を返したため、動画追加後の従来画像は更新していない。
- ユーザー説明では、ニコニコ動画がPHP脆弱性対応の緊急メンテナンス中だった。実測でも検索ページがHTTP 503、動画情報取得が`OFFLINE`となったため、CommonHeader、Watch上のcomment-filter2・mlink-video-controller・背景画像設定、movie-info、movie-fetcher、watch-history、video-playerの再撮影は未実施である。既存画像を成功扱いで上書きせず、サービス復旧後に`bun run docs:capture`を再実行する。

## 2026-10-22: push前の依存更新

- `bun audit`は106パッケージで既知の脆弱性0件だった。`bun outdated`で互換範囲に残っていたtypescript-eslint 8.72.0へ更新し、再監査で脆弱性0件、互換範囲の更新残り0件を確認した。TypeScript 7.0.2は現在の`typescript`指定範囲に入らず、`bun outdated`の更新候補は6.0.3のままである。
- 更新後の`bun run verify`でPrettier、ESLint、型検査、単体267件、Playwright 92件、39ファイルのビルドが成功した。`python scripts/build-docs.py`の厳格ビルドと`git diff --check`も成功した。
