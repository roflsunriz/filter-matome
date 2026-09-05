# CommonHeader通知の一括既読契約

## 調査目的

公式CommonHeaderのベル内から通知先ページを開かず、現在取得できる全未読通知を一括で既読にするため、公開配布物を実行せずメモリー上でde-minifyし、一覧取得、ページング、個別既読、表示更新の境界だけを確認した。公式コードは製品へ取り込まず、確認できたURL、メソッド、ヘッダー、レスポンスの必要フィールドだけを`src/common/notification-read-all.ts`と匿名fixtureへ移した。

## 確認した公開資産

確認日: 2026-08-23

| 資産 | バイト数 | SHA-256 |
|---|---:|---|
| `https://common-header.nimg.jp/3.13.0/responsive/CommonHeader.min.js` | 303502 | `45fa873a96d8de77e14f333658439ca1632db7e54d0cdcdb0d3adc77f93ac8b3` |
| `https://inform.nicovideo.jp/oshirase/index-20260818_130906_70e9320.js` | 700072 | `71d2a4f66e914f5d1ba1e8fdcbe668b5bdc76261539ce1d84a9f5d7fdb860e47` |

`common-header.nimg.jp/version/common_header_version.json`の`bateleur`は`3.13.0`だった。隔離済みcaptureのCommonHeader `3.12.0`でも、以下のベル関連エンドポイントとメソッドは同じだった。

## 確認した契約

### CommonHeaderのベル

- ベルの状態: `GET https://api.oshirasebox.nicovideo.jp/v1/bell`
- ベルを開いたときの先頭一覧: `GET https://api.oshirasebox.nicovideo.jp/v1/box?offset=0&importantOnly=false`
- 通知クリック時の既読: `PUT https://api.oshirasebox.nicovideo.jp/v1/notifications/<通知ID>/read?header=<pc|sp>`
- CommonHeaderは`credentials: include`、`X-Frontend-Id`、一覧と既読では`X-Request-With: location.href`を使う。
- ベルを開く処理はローカルの赤点状態を消すが、一覧の全通知を既読にはしない。
- `POST https://api.feed.nicovideo.jp/v1/read`はフォロー新着タイムライン用で、ベル通知の一括既読には使わない。

### 公式通知一覧アプリ

- 一覧は同じ`GET /v1/box`を使い、`data.notifications`と`data.nextUrl`を受け取る。
- `data.nextUrl`がある間はquery stringを次の一覧取得へ渡し、取得した通知をIDで重複排除して追加する。
- 既読は通知IDごとの`PUT /v1/notifications/<通知ID>/read`で、専用の全件一括エンドポイントは公開資産の利用経路にない。
- 通知一覧アプリの`X-Frontend-Id`は`135`である。

## filter-matome側の安全境界

1. `GET /v1/box?offset=0&importantOnly=false`から開始する。
2. 全ページを先に取得し、`data.notifications[].id`、`read`、`data.nextUrl`を検証する。
3. `nextUrl`はoriginが`https://api.oshirasebox.nicovideo.jp`、pathが`/v1/box`の場合だけ許可する。
4. URL循環、100ページ超、5000通知超、JSON不正ではPUTを1件も送らない。
5. 未読IDだけを重複排除し、同時4件、最大8件までの制限付き並列で個別PUTする。
6. `401`、`403`、`429`では残りの新規PUTを止め、未処理分を失敗として再試行可能にする。
7. 全成功・部分失敗とも、処理完了後に100番の`FilterMatomeNotificationReadApi.refresh()`で公式一覧を再取得する。開いているパネルは維持し、閉じたパネルは再度開かない。APIのない旧キャッシュ・未知の公式資産では、従来どおり全成功時だけ閉じて次回オープン時に同期する。

自動テストでは実サービスへGET・PUTせず、`tests/fixtures/common-header-notifications.json`と`nicovideo-common-header-notifications.html`をPlaywright routeで配信する。fixtureは公式資産から確認した必要フィールドとDOM構造だけを匿名値で再構成し、Cookie、通知本文、ユーザーIDなどの個人情報を含めない。

## 2026-09-05: 開いたままの表示更新と世代間Match

既存sandboxには3.12.0 responsive（2026-07-23 capture）、3.13.0 PC/responsive（2026-08-24 destroy-ads capture）が存在した。内容SHA-256で重複を除き、公式CDNから3.11.0 PC/responsiveと3.12.0 PCを追加取得して、3世代6資産を比較した。最新version JSONの`bateleur`は引き続き3.13.0だった。

各URLは`https://common-header.nimg.jp/<版>/<形式>/CommonHeader.min.js`。2026-09-05の再取得でも既存captureの同一版のSHA-256は一致した。

| 版 | 形式 | bytes | SHA-256 | action factory名 |
|---|---|---:|---|---|
| 3.11.0 | pc | 300508 | `7b7839b2ca865ae42042d33bfb18a5060cd7d78cec8197e17b0e6996ec7c746d` | `Wn` |
| 3.11.0 | responsive | 337613 | `52ccd26b61898ac65b2415a317dd25a0c69e97a15c7d3ac74bf879759c2d8196` | `er` |
| 3.12.0 | pc | 300821 | `dff1694567b47261b2b5c5f7fe4b9795590b97c5fcfaf500f6a2bb8013323cef` | `Dn` |
| 3.12.0 | responsive | 338093 | `dd5ae6daa711a0dafac871baa317d04bd2ab26c59e023437c27907a66b8744fe` | `Vn` |
| 3.13.0 | pc | 266230 | `b3b70878aa62c2135bc0e862c17329e03bdff3493d5c555c82d5c002f2136606` | `Dn` |
| 3.13.0 | responsive | 303502 | `45fa873a96d8de77e14f333658439ca1632db7e54d0cdcdb0d3adc77f93ac8b3` | `Vn` |

### 接続する意味境界

`openOshiraseBox`はパネルのopen状態を設定し、公式のfrontendId付き`GET /v1/box`成功後に`oshiraseBoxBox`をstoreへ保存する。この結果から通知の`read`による太字・背景色と`importantUnreadCount`が描画される。すでに開いている状態で再度呼んでもパネルと既存通知DOMは維持される。通知IDとDOM位置を独自に対応付ける必要はない。

100番はaction factoryの先頭へ`version: 1`と`refresh()`だけを公開する。closureはそのfactoryのstoreとaction集合を参照し、storeの現在の`isOshiraseBoxOpen`がtrueの場合だけ`openOshiraseBox(state)`を呼ぶ。内部storeや通知内容はグローバルへ公開しない。プローブではAPIの版と関数の存在だけを検査し、`refresh()`を実行しない。

初回公開時だけmicrotaskで`filter-matome:api-status-change`を送出する。factoryがaction集合を生成し終える前に通知しないため、受信側が未初期化のclosureを観測しない。通常のaction factory再生成では通知を繰り返さない。

Matchはfactory名に依存せず、store・reset状態・action集合・引数・イベント発行元をcaptureする。7つのパネル初期状態、`openServiceMenu`、`closeServiceMenu`、`openOshiraseBox`の順序、同じstoreの`setState`、同じreset状態をspreadする関係、`search:close`の発行元をbackreferenceで固定する。将来この意味境界が変われば一致しなくなる設計であり、未知の世代での動作を保証しない。

初案の3.13.0と`Vn/Dn`への固定は採用せず、実際にfactory名が変化した3世代の確認後にcaptureへ置き換えた。sandboxの重複排除済み対象6資産でそれぞれ1回、その他のJavaScript 470資産で0回一致した。6資産すべての置換後コードをprettierで構文解析した。

### 動的検証

`bun scripts/sandbox/verify-notification-refresh.ts --cdp=http://127.0.0.1:9222`で再実行できる。Chromeの一時タブで公式資産を実行するが、全ブラウザー要求を捕捉して匿名fixtureだけを返し、実際の通知へPUTしない。

- PCは1280×800、responsiveは390×800で6資産を確認。
- 全成功後、通知行のfont-weightが700→400、背景が白→`rgb(250, 250, 250)`へ変化。同じパネルと一括既読ボタンが接続されたまま残る。
- 部分失敗後、成功行だけが既読表示となり、失敗行は700・白のまま残る。
- 処理中に公式の`closePanel()`で閉じた場合、完了後にパネルを再度開かない。
- NicoCache_nlの実プロキシー経由でも3.13.0 PC/responsiveともHTTP 200、API接続の挿入を確認した。接続には設置済みのCA証明書を使い、証明書検証を無効化していない。
- ビルド後の匿名の動画トップでは、手動注入なし・通常キャッシュ経路でAPI一覧の通知表示更新が`active`へ自動反映された。

これは匿名fixtureでの公式コード動作と配信経路の検証であり、利用者のFirefoxプロフィールや実通知への書き込みを検証したものではない。
