# movie-fetcher

ニコニコ動画の一覧カードから選択した動画をすぐ取得する機能と、日時・帯域・容量を指定して順番に取得するsmartFetcherを提供します。どちらも最高利用可能画質・音質をNicoCache_nlへ最後まで取得させます。

## 構成

- `core.ts`: 現行Watch APIとaccess-rights APIの交渉、Java拡張APIクライアント。
- `index.ts`: 現行カードDOMへのボタン追加、SPA追従、進捗・中止表示。
- `scheduler-app.ts` / `scheduler-client.ts`: 予約・設定・履歴SPAと永続APIクライアント。
- `scheduler.html` / `scheduler-i18n.ts`: レスポンシブ画面と多言語表示。
- `extensions/nlMovieFetcher.java`: 署名済みDomand playlistをNicoCache_nl自身のプロキシー経由で取得するサーバー側拡張。
- `extensions/FilterMatomeSmartFetcher.java`: 永続予約、Cookie保管、Watch/access-rights交渉、容量判定、帯域制御、再試行、履歴を担当するサーバー側拡張。

通信仕様と実測根拠は `../api-info/nl-movie-fetcher-api.md` を参照してください。

## 利用条件

`nlMovieFetcher.class` と `FilterMatomeSmartFetcher.class` がNicoCache_nlのユーザーデータルートにある `extensions/` から読み込まれている必要があります。ブラウザー側だけが更新されてJava拡張がない場合、ボタンまたは予約画面は接続失敗になります。NicoCache_nlの再起動後に利用してください。

GUI起動時はNicoCacheGUIへ`nlMovieFetcher`タブを追加します。タブには動画IDごとの取得受付、watch/access-rights APIのブラウザー側失敗、playlistとCMAFリソースの検出数、10件単位の進捗、完了・中止・失敗理由を表示します。ブラウザー側エラーは短縮し、URLを省略します。署名付きURL、Cookie、アクセス権キーは表示しません。

取得中に同じボタンを押すと中止要求を送ります。ページを閉じてもJava側の取得は継続します。アクセス権キーはJava側へ渡しません。短寿命の署名付きマスターURLと、Domand配信URLにも適用される配信用Cookie `domand_bid`だけをメモリーで受け渡します。認証用`nicosid`や検索設定など他のCookieは転送せず、Cookie値をログやAPIレスポンスへ出力しません。

## smartFetcher

動画カードのカレンダーボタン、または `/local/features/dist/pages/movie-fetcher/index.html` を開いて予約します。登録画面は「動画を選ぶ」「日時を選ぶ」「内容を確認」の3段階ウィザードです。動画IDの検査でタイトル、時間、選択品質のビットレートから推定サイズを算出してから保存します。曜日・祝日・優先度・再試行は予約の詳細設定、帯域・安全率・タイムゾーンは通信・容量判定の詳細設定を開いた場合だけ表示します。

- 開始・停止日時、または開始日時と取得可能時間を指定できる。
- 1回、毎日、毎週、毎月、毎年と曜日、日本の祝日を組み合わせられる。月末、うるう年、夏時間などは設定タイムゾーンの暦で計算する。JavaとOSがうるう秒を通常の時計補正として扱う場合も、永続した次回時刻と実行状態により同じ回を重複実行しない。
- 固定B/s、指定回線速度の割合、初回実績を学習した割合から帯域上限を決める。推定サイズ、安全率、予約枠、優先度を全予約でシミュレーションし、期限に間に合わない予約を`capacity-rejected`として実行対象外にする。
- 取得失敗や不完全取得は履歴へ記録し、設定回数だけ指数バックオフで再試行する。再試行終了後は次の動画へ進む。
- 取得履歴は1件ずつ、または確認後にまとめて削除できる。履歴の削除は予約と取得済み動画キャッシュには影響しない。
- 予約、設定、履歴は `data/filter-matome-smart-fetcher.json` へ原子的に保存する。破損時は `.corrupt-<時刻>` へ退避し、実行中の再起動は中断履歴として回収する。

Cookieはニコニコ動画のPOST通信を通過したときに更新され、`nicosid`、`domand_bid`、`user_session`、`user_session_secure`だけを保存します。値はAES-GCMで暗号化した `data/filter-matome-smart-fetcher.credentials.json`、256ビット鍵は別の `data/filter-matome-smart-fetcher.key` に保存し、対応OSでは所有者だけへファイル権限を限定します。状態API、JSON状態、GUIログにはCookie、署名URL、アクセス権キーを含めません。予約画面から保存Cookieだけを削除できます。鍵と暗号文を同時に読める同一OSユーザーや管理者から保護する仕組みではないため、NicoCache_nlのユーザーデータルート自体も適切に保護してください。
