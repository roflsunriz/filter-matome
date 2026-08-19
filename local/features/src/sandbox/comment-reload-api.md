# 公式コメント再取得APIの調査記録

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

ストア本体、Watchデータ、thread keyは公開しない。comment-filter2は`reload()`を呼び、再取得時の`POST /v1/threads`レスポンスを従来の`DataInterceptor`でフィルタリングする。APIがない、版が違う、または呼び出しに失敗した場合だけ、従来の確認付きページ再読み込みへフォールバックする。

## 追従確認

公式資産を再取得した後、次を実行する。

```powershell
cd local/features
bun run sandbox:analyze-comment-reload
bun test tests/comment-reload-nlfilter.test.ts tests/official-player-bridge.test.ts
bunx playwright test tests/comment-filter2.spec.ts
```

解析コマンドは最新captureをメモリー上でde-minifyし、`POST /v1/threads`、`fetchAdditionals`の再利用、nlFilterのMatchと注入内容を検証する。失敗時は`102_comment_reload_api.txt`を推測で緩めず、新しい公式actionがストアと描画を更新するところまで再解析する。
