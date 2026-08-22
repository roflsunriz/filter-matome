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
7. 全成功時だけ公式ベルを閉じ、次回オープン時の公式再取得で表示を同期する。部分失敗時はパネルを残し、成功・失敗件数を表示する。

自動テストでは実サービスへGET・PUTせず、`tests/fixtures/common-header-notifications.json`と`nicovideo-common-header-notifications.html`をPlaywright routeで配信する。fixtureは公式資産から確認した必要フィールドとDOM構造だけを匿名値で再構成し、Cookie、通知本文、ユーザーIDなどの個人情報を含めない。
