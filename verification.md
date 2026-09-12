# 検証手順

## 全編先読みの容量制限・A-Bの公式時計ずれ（2026-09-13）

報告条件は`sm45650421`、360p/192k、Firefox。前回は短い公開動画の要素時刻だけを確認し、公式の独立した時計と容量を超える取得を検証できていなかった。

全編先読みはAPI v2の取得計画を使い、両playlistを先に取得してから同時2要求以内で応答をストリーム消費する方式へ変更した。再生用バッファーの上限と読込位置を変更せず、同じ品質のNicoCache_nl完成キャッシュを確認して100%とする。A-Bと通常のシーク・再生/停止は、API v1の公式mediaへ接続し、シーク開始→確定と保留位置の表示を維持する。

| 検証 | 結果 |
| --- | --- |
| 全体単体テスト | 266件合格。192MiB相当のストリーム消費、取得中止、別品質の完成除外、公式時計の下限、非同期シーク、プレビュー除外を含む |
| 全体Chromium E2E | 92件合格 |
| 認証状態のないFirefox E2E | 22件合格。A-B・時刻入力・終端・再接続・ローカル再生・先読み・API表示・狭幅/RTL |
| 世代比較 | 6ビルド・8資産で両APIのMatchが各1回、対象外526資産で0回。構文・HLS計画・公式時計の参照関係を確認 |
| 公開動画sm9の実配信 | 360p/128kの完成キャッシュ100%、100秒で一時停止維持、公式時計と要素時刻がともに100秒へ戻ること、両APIの自動activeを確認 |
| A-Bの細かい観測 | 50ms間隔100点を測定。95点は確定済みで時刻差0.3秒以内、5点は公式のシーク保留中。保留位置はAであり1秒以内に確定し、停止後も両時計が揃うことを確認 |
| 指定動画・実利用Firefox | **未確認**。匿名ではログイン必須画面。既存Chromeの認証状態を利用する試行は、利用未承認として自動承認審査に拒否された。Firefoxのログイン済みプロフィールを使う最終確認が残る |

シーク中は公式の表示が先に保留位置Aへ変わり、旧フレームが短時間残る。これを確定後の時計ずれと混同しないよう、実測スクリプトは`seeking`を記録し、保留時間・Aへの確定・確定後の差を検査する。元の不具合である「シークしていないのに公式時計が旧位置に残る」状態は、この検査でも失敗する。

旧操作を再現した実測では、要素を100秒へ戻しても公式時計が約231秒に残った。公式の確定だけを呼ぶ方法も途中のtickで戻り得たため、開始→確定の順序と公式getterの既定の保留位置を利用する形に直した。詳細は`local/features/src/sandbox/playback-control-bridge.md`と`full-buffer-bridge.md`を参照する。

format、lint、型チェック、全体ビルド、MkDocs strictが合格し、匿名の実ページから操作画像を更新して文字切れがないことを確認した。再生用バッファー保持とNicoCache_nlの取得完了を説明で区別し、API版・操作・更新・復旧の文書を同期した。

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

WindowsのPlaywright実行ファイルshim停止は前回と同じため、同じpackage.json定義を`bun --bun run test`で実行した。Firefoxのブラウザー生成は新規・未認証プロフィールを使い、Windowsのプロセス制約を避けて昇格実行した。既存の認証情報の利用とは分けている。実利用プロフィールの確認前には共通指針の中断・注意喚起を行い、許可された範囲だけを検証する。

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

NicoCache_nlを起動し、匿名の一時Chromeセッションから現行の実ページとビルド済みSPAを撮影します。

```powershell
cd local/features
bun run docs:capture
cd ../..
mkdocs build --strict
```

`docs/resources/`と`cover-images/`の生成画像を目視し、comment-filter2、mlink-video-controller、背景画像設定、watch-history、mylist2、movie-info、movie-fetcher、video-player、CommonHeaderが現在の画面構成と一致することを確認します。あわせて、ユーザー名、アイコン、Cookie、秘密情報、ローカルキャッシュパスなど、匿名サンプル以外の情報が写っていないことを確認します。

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
