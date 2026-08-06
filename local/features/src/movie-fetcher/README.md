# movie-fetcher

ニコニコ動画の一覧カードから、選択した動画の最高利用可能画質・音質をNicoCache_nlへ最後まで取得させる機能です。

## 構成

- `core.ts`: 現行Watch APIとaccess-rights APIの交渉、Java拡張APIクライアント。
- `index.ts`: 現行カードDOMへのボタン追加、SPA追従、進捗・中止表示。
- `extensions/nlMovieFetcher.java`: 署名済みDomand playlistをNicoCache_nl自身のプロキシー経由で取得するサーバー側拡張。

通信仕様と実測根拠は `../api-info/nl-movie-fetcher-api.md` を参照してください。

## 利用条件

`nlMovieFetcher.class` がNicoCache_nlのユーザーデータルートにある `extensions/` から読み込まれている必要があります。ブラウザー側だけが更新されてJava拡張がない場合、ボタンは取得失敗状態になります。NicoCache_nlの再起動後に利用してください。

GUI起動時はNicoCacheGUIへ`nlMovieFetcher`タブを追加します。タブには動画IDごとの取得受付、playlistとCMAFリソースの検出数、10件単位の進捗、完了・中止・失敗理由を表示します。署名付きURL、Cookie、アクセス権キーは表示しません。

取得中に同じボタンを押すと中止要求を送ります。ページを閉じてもJava側の取得は継続します。アクセス権キーはJava側へ渡しません。短寿命の署名付きマスターURLと、Domand配信URLにも適用される配信用Cookie `domand_bid`だけをメモリーで受け渡します。認証用`nicosid`や検索設定など他のCookieは転送せず、Cookie値をログやAPIレスポンスへ出力しません。
