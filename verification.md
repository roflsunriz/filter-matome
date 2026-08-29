# 検証手順

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
