# 会員種別による機能差別化の調査

## 結論

ニコニコ動画の視聴ページは、アカウントの会員種別を `guest`、`regular`、`premium` の3区分で扱う。一方、チャンネル会員、継続入会特典、PPV購入、プレミアム限定動画の視聴権は、アカウント区分とは別のコンテンツ権利として判定される。

filter-matomeでは公式の会員・購入権利を偽装せず、認可済みのローカルキャッシュ再生、ローカル設定、ローカル履歴、公式サーバーへ送信しないコメントフィルターを会員種別に依存しない差別化領域とするのが安全である。

## 調査条件

- 調査日時: 2026-07-24（JST）
- 対象: `https://www.nicovideo.jp/watch/sm9`
- ブラウザー: Chrome 150.0.7871.130
- raw CDP capture: `2026-07-23T20-21-01-436Z`
- capture manifest SHA-256: `BB82DDB2748AC51B556D6FD54E45006FB196ED503EBF0E5E941C43AEFEF86F82`
- 取得物: 公式watchアセット109ファイル、合計3,146,016 bytes
- 依存モジュール巡回: 失敗0件、Cookie・Authorizationを付けずに取得

ログイン済みの既存BrowserContextと、Cookieを継承しない一時BrowserContextで同じ動画を観測した。保存した観測値は会員区分、動画権利フラグ、広告項目数だけであり、Cookie、ヘッダー、ユーザーIDなどの個人識別子は保存していない。

プレミアムアカウントでの実ページ観測は行っていない。プレミアム分岐は、取得済み公式ES Moduleを外部通信遮断済みの一時BrowserContextで実行した結果と、公式バンドルの静的解析を組み合わせて確認した。

## 会員種別の観測

| 観測対象 | ログイン | `sessionUser.type` | `viewer.isPremium` |
| --- | --- | --- | --- |
| 既存のログイン済みContext | あり | `regular` | `false` |
| Cookieを持たない一時Context | なし | `guest` | 値なし |
| プレミアム分岐 | 実ページ未観測 | `premium`として公式モジュールを実行 | 静的解析で参照を確認 |

`sm9` は両Contextで無料かつ全ユーザー視聴・コメント可能であり、`isPpv`、`isAdmission`、`isContinuationBenefit`、動画側の `isPremium` はすべて `false` だった。両者とも広告項目が2件あったため、この1動画だけから広告表示の全条件までは断定しない。

## 確認できた機能差

### プレイヤー

| 機能 | 未ログイン・一般 | プレミアム | 根拠 |
| --- | --- | --- | --- |
| 再生速度 | 0.25～1.25倍 | 左記に1.5、1.75、2倍を追加 | `PlayerSeekBar-DV9Bs-dx.js` の公式関数を隔離実行 |
| スキップ秒数 | 10秒 | 5、10、15、30秒 | `PlayerOptionPresenter-BlPrwg0n.js` |
| 前回位置から再生 | 制限あり | 利用可能 | 同上 |
| 映像の左右反転 | 制限あり | 利用可能 | 同上とプレイヤー状態処理 |
| シーク時ストーリーボード | 制限あり | データがある場合に利用 | `PlayerSeekBar-DV9Bs-dx.js` |
| 画質・音質 | サーバーが返す利用可否に従う | 選択肢が増える場合がある | `quality-audio-delivery.md`、`PlayerOptionPresenter-BlPrwg0n.js` |

再生速度については公式コードをloopbackからimportし、外部HTTP要求が `BlockedByClient` になること、隔離BrowserContextであることも同時に確認した。未ログインと一般では1.5倍以上が `available: false`、プレミアムでは全8段階が `available: true` になった。

### コメントとNG

| 機能 | 一般 | プレミアム | 備考 |
| --- | --- | --- | --- |
| 公式ユーザーNG上限 | 40 | 400 | 公式バンドル内の上限値 |
| 追加コメント色 | なし | 10色を追加 | `white2`、`red2`、`pink2`、`orange2`、`yellow2`、`green2`、`cyan2`、`blue2`、`purple2`、`black2` |
| ニコる | プレミアム要求になる経路あり | 利用可能 | APIの `PREMIUM_ONLY` エラー処理も存在 |
| 自分のコメント削除 | 投稿後24時間以内 | 時間制限なし | `ExpandedComment-lwaXXr8m.js` |

公式NGリスト、ニコる、コメント削除、プレミアム色付き投稿は公式サーバー側の機能である。filter-matomeから利用するときは、現在のアカウントとAPI応答をそのまま尊重する。

### その他

- 投稿者による動画差し替えは投稿後24時間以内がプレミアム向け機能として案内される。
- マイリスト作成上限のエラーには、プレミアムで総登録上限が増える案内がある。
- 一般会員のタグ編集にはreCAPTCHA要求の分岐がある。
- 非プレミアムには同時視聴セッション数を検査する分岐があり、プレミアムはその検査を省略する。
- 公式バンドルには広告非表示・広告訴求に関するプレミアム導線があるが、広告配信条件はサーバー応答も関係するため、バンドルだけから完全な仕様とは断定しない。

## 会員種別とは別の権利軸

次の値は `guest`／`regular`／`premium` と同じ軸ではない。

| 権利 | 主なフラグ・値 | 意味 |
| --- | --- | --- |
| プレミアム限定動画 | `payment.video.isPremium`、`needPremiumPayment` | 動画自体がプレミアム契約を要求 |
| チャンネル入会 | `isAdmission`、`watchableUserType` | 対象チャンネルの会員権 |
| 継続入会特典 | `isContinuationBenefit` | 入会期間に基づく権利 |
| PPV | `isPpv`、`billingType` | 個別購入・レンタル等の権利 |
| コメント権 | `commentableUserType`、`notChannelMember` | 視聴権とは別に投稿可否を指定可能 |

たとえばプレミアム会員でも未加入チャンネルの会員限定動画を自動的に視聴できるとは限らず、一般会員でも購入済みPPVを視聴できる場合がある。UIや型では「アカウント種別」と「現在の動画に対する権利」を別々に表示・保持する必要がある。

## filter-matomeの差別化方針

推奨する差別化は次のとおり。

1. 認可済みローカルキャッシュのスタンドアロンプレイヤーでは、再生速度、任意秒数スキップ、再開位置、左右反転、ローカル生成プレビューを会員種別に依存せず提供する。公式プレイヤーの機能を解除するのではなく、「ローカルプレイヤーの機能」と明示する。
2. ローカルコメントフィルターは公式NGリストと分離し、公式上限を超えるルール、バックアップ、インポート・エクスポートをローカル機能として提供する。公式NG APIへ上限を超えて書き込まない。
3. ローカル視聴履歴、検索、統計、キャッシュ情報、MediaInfo、独自マイリストなど、ユーザー自身のローカルデータを中心に差別化する。
4. 公式APIへ送るニコる、削除、コメントコマンド、画質選択では、会員状態とサーバーの利用可否を尊重し、失敗理由をUIへ明示する。
5. `sessionUser.type`、`viewer.isPremium`、画質の `isAvailable`、動画権利フラグを書き換えない。広告要求を抑止したり、プレミアム・チャンネル・PPV制限を回避したりしない。

## 再現手順

取得物はGit管理外である。起動済みraw CDP endpointとログイン済みニコニコ動画タブがある環境で、`local/features/` から実行する。

```powershell
bun run sandbox:capture-official
bun run sandbox:observe-membership
bun run sandbox:run-membership
bun run sandbox:verify-offline
bun run sandbox:analyze-official
```

`sandbox:observe-membership` は個人識別子を除いた観測値を最新capture内の `membership-context.json` へ保存する。`sandbox:run-membership` は取得済み公式モジュールを外部通信遮断下で実行し、`membership-runtime-matrix.json` へ結果を保存する。これらのcapture成果物はコミットしない。
