# 公式コメント再取得APIの調査記録

Matchの版ごとの差分、安定点、汎化条件は[公式コメント再取得nlFilter Match履歴](comment-reload-match-history.md)へ時系列で記録します。

## 調査対象

- 取得日時: 2026-07-23T20:21:01.436Z
- 公開資産: `https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerSeekBar-DV9Bs-dx.js`
- SHA-256: `031e174456308e80863ad1f9fd8dd61d45706c1a2f6aa75562e0185c9651f646`
- 保存先: `official-watch-bundle/captures/2026-07-23T20-21-01-436Z/`

取得済みの公開ES ModuleをPrettierでメモリー上だけde-minifyし、実行せず静的に追跡した。Cookie、認証ヘッダー、HTML、個人識別子は使用していない。

## 確認した再取得経路

コメントストアの取得actionは、Watchデータに含まれるコメントサーバー、動画ID、`nvComment.params`、直前の`fetchAdditionals`を使い、`POST /v1/threads`を再実行する。thread keyが必要な場合は既存のキー取得処理を通す。

成功後はレスポンスのthreadとcommentを公式ストアへ再構築し、公式NG処理を再実行する。コメント投稿後にも同じactionが呼ばれているため、HTTPレスポンスを取得するだけでなく公式の描画状態まで更新する境界として利用できる。

minify後の内部名では、取得actionが`Ar`（export alias `O`）、現在の追加条件で再取得するactionが`kr`だった。これらの名前は公式ビルドごとに変化し得るため、プロダクションコードから直接参照しない。

## filter-matomeの接続

`nlFilters/102_comment_reload_api.txt`は、取得actionの実行時にストア参照をclosureへ閉じ込め、次の最小境界だけを`globalThis`へ公開する。

- `FilterMatomeCommentApi.version`: 契約版`1`
- `FilterMatomeCommentApi.reload()`: 直前と同じ追加条件で公式コメントを再取得するPromise

ストア本体、Watchデータ、thread keyは公開しない。comment-filter2は`reload()`を呼び、再取得時の`POST /v1/threads`レスポンスを従来の`DataInterceptor`でフィルタリングする。APIの初期化中は短時間待機する。APIがない、または版が違う場合は効果のない通常再読み込みを自動実行せず、更新後の資産を取得するため一度だけ`Ctrl+F5`が必要なことを通知する。API呼び出し自体の失敗は通信エラーとして通知し、再試行できる状態を保つ。

## 現行資産での再検証（2026-08-20）

プロキシーを明示的に無効化したCookieなし一時Chromeから、更新後の公開資産`PlayerSeekBar-DzqrqG09.js`を取得した。公式原本のSHA-256は`0a2046ec57d9a19f386dd3c8a02e9867837ad3874b167abd8728b702a49d43d9`で、既存Matchは1回だけ一致した。nlFilter適用後の同資産もde-minifyと構文解析に成功した。

別のCookieなし一時BrowserContextをNicoCache_nl経由で開き、`sm9`で動的検証した。`FilterMatomeCommentApi.version === 1`を確認後に`reload()`を呼ぶと、`POST /v1/threads`が1回だけ送信されHTTP 200を受けた。`CommentFilter2Data.lastUpdated`は増加し、URLと`performance.timeOrigin`は変化しなかったため、ページ全体を再読み込みせず再取得レスポンスがcomment-filter2へ再入力されたことを確認した。

## capture group Matchへの更新（2026-08-26）

Cookieなし・プロキシーなしのChrome 152で`PlayerSeekBar-BKS3ifbV.js`を採取した。SHA-256は`93922c43a79b90f56f74c7b11cc906503695ba1bc38e839688cf53bc1712e949`、サイズは`1,397,190 bytes`だった。旧Matchは取得action、状態guard、API呼び出しのminify名変更により0件になった。

2026-08-24版では`Yi` / `nn` / `Oi`、2026-08-26版では`Xi` / `rn` / `ki`へ識別子が変わった一方、同一storeの`current()`とWatchコメントAPIのserver、video id、params、additionalsの関係は維持された。これらをcapture groupとbackreferenceで固定するMatchへ更新し、保存済み6 captureすべてで対象1件・他資産0件、最新原本への置換とde-minify後構文を確認した。

## 追従確認

公式資産を再取得した後、`comment-reload-match-history.md`へ新しい版の観測を追記してから次を実行する。

```powershell
cd local/features
bun run sandbox:analyze-comment-reload
bun run sandbox:verify-comment-reload
bun test tests/comment-reload-nlfilter.test.ts tests/official-player-bridge.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析コマンドは最新captureをメモリー上でde-minifyし、`POST /v1/threads`、`fetchAdditionals`の再利用、nlFilterのMatchと注入内容を検証する。動的検証コマンドは起動済みChromeのCookieなし一時BrowserContextを使用し、API呼び出しが`POST /v1/threads`を1回だけ実行して200を受け、comment-filter2の更新時刻を進め、ページのURLと`performance.timeOrigin`を変えないことを確認する。失敗時は`102_comment_reload_api.txt`を推測で緩めず、新しい公式actionがストアと描画を更新するところまで再解析する。
