# 検証手順

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
