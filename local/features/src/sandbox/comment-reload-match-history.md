# 公式コメント再取得nlFilter Match履歴

## 目的

`nlFilters/102_comment_reload_api.txt`の`Match`を、公式資産の更新へ追従しながら将来安全に汎化するための時系列記録です。単に過去の正規表現を並べるのではなく、各版で次を分離して残します。

- 公式資産を識別するURL、取得日時、SHA-256、サイズ
- 実際に一致したminify済み断片と一致数
- 再取得actionだと判断した意味上の根拠
- 前版から変化した部分と、変化しなかった部分
- 静的検証、置換後構文検証、動的検証の結果
- 次の版でも安定すると確認できていない仮説

この文書の履歴は汎化候補を作るための観測資料であり、2例程度の一致を一般規則の証明として扱いません。

## 現行Match

2026-08-20現在の実装は次の正規表現です。

```regex
Le\(e,\[`initialized`,`fetched`\]\);let n=e\.current\(\),r=yield lr\(
```

一致対象のminify済み断片は次のとおりです。

```javascript
Le(e,[`initialized`,`fetched`]);let n=e.current(),r=yield lr(
```

このMatchは内部識別子`Le`、`e`、`n`、`r`、`lr`へ依存します。誤一致を避けるため現時点では意図的に狭くしており、汎用性が証明されたMatchではありません。

## 時系列

### 2026-07-23: 初回解析

| 項目 | 観測値 |
| --- | --- |
| capture | `captures/2026-07-23T20-21-01-436Z/` |
| 取得日時 | `2026-07-23T20:21:01.436Z` |
| Chrome | `150.0.7871.130` |
| 資産 | `PlayerSeekBar-DV9Bs-dx.js` |
| capture SHA-256 | `031e174456308e80863ad1f9fd8dd61d45706c1a2f6aa75562e0185c9651f646` |
| captureサイズ | `1,385,964` bytes |
| Match一致数 | 1 |
| 一致開始オフセット | 42,308 |
| 認証情報・HTML保存 | なし |

このcaptureは当時の取得経路にプロキシー無効化の記録がないため、SHA-256を公式原本のハッシュとは断定しません。ただし対象断片に`FilterMatomeCommentApi`の注入はなく、Match評価に使ったminify済み断片は保存済み資産で確認しています。

一致前後では、再取得wrapperが現在の`fetchAdditionals`を取得actionへ渡し、取得actionがstore状態を検証してから`current()`を読み、コメントAPI呼び出しへ進んでいました。

```text
... yield kr(e) ... var Ar=... function*(e,t={}) {
  Le(e,[`initialized`,`fetched`]);
  let n=e.current(),r=yield lr(
    n.watch.comment.nvComment.server,
    n.watch.video.id,
    n.watch.comment.nvComment.params,
    t
  ) ...
}
```

この時点で観測したminify名は、取得action=`Ar`、再取得wrapper=`kr`、状態guard=`Le`、API呼び出し=`lr`でした。将来も同じ名前になる保証はありません。

### 2026-08-20: 更新後の公式原本と動的検証

| 項目 | 観測値 |
| --- | --- |
| capture | `captures/2026-08-19T23-45-24-377Z/` |
| 取得日時 | `2026-08-19T23:45:24.377Z`（日本時間2026-08-20） |
| Chrome | `151.0.7922.169` |
| 資産 | `PlayerSeekBar-DzqrqG09.js` |
| 公式原本SHA-256 | `0a2046ec57d9a19f386dd3c8a02e9867837ad3874b167abd8728b702a49d43d9` |
| 公式原本サイズ | `1,387,716` bytes |
| Match一致数 | 1 |
| 一致開始オフセット | 42,332 |
| 認証情報・HTML保存 | なし |

一時Chromeを`--no-proxy-server`で起動して取得したため、この版は公式原本として記録します。資産名、SHA-256、総サイズは前回から変化し、一致位置は24バイト後方へ移動しました。一方、上記Matchの断片、取得action周辺、minify名`Ar`、`kr`、`Le`、`lr`は前回と同一でした。

同日にNicoCache_nl経由で取得した変換後資産では、元のMatchが0件、`FilterMatomeCommentApi`注入が1件でした。Cookieなし一時BrowserContextで`reload()`を実行し、次も確認しました。

- `POST /v1/threads`が1回だけ送信されHTTP 200
- `CommentFilter2Data.lastUpdated`が増加
- URLと`performance.timeOrigin`が不変
- ページ全体の再読み込みなし

## 現時点で安定している観測

| 観測点 | 2026-07-23 | 2026-08-20 | 汎化への扱い |
| --- | --- | --- | --- |
| 対象CDNパス | `nvpc_next/assets/*.js` | 同じ | URLの候補絞り込みに利用可能 |
| chunkの論理名 | `PlayerSeekBar-*` | 同じ | chunk分割で変わり得るため必須条件にはしない |
| store状態 | `initialized` / `fetched` | 同じ | 強い意味上の目印 |
| storeの`current()`読取 | あり | あり | 強い意味上の目印 |
| コメントAPI入力 | server、video id、params、additionals | 同じ | 最も重要な意味上の目印 |
| API経路 | `POST /v1/threads` | 同じ | 再取得action確認に必須 |
| 追加条件 | `fetchAdditionals` | 同じ | 再取得wrapper確認に必須 |
| minify名 | `Ar`、`kr`、`Le`、`lr` | 同じ | 2例だけなので安定要素とはみなさない |
| export alias | `O` | `O` | 公開APIではなく変更されやすいため依存しない |
| バイトオフセット | 42,308 | 42,332 | 使用禁止 |
| 資産ハッシュ・サイズ | 版ごとに異なる | 版ごとに異なる | 識別・監査用。Match条件には使わない |

## 汎化するときの方針

### 優先順位

1. de-minify後の構文木から意味上の条件を満たすactionを1件に絞り、minify済み原文の範囲を逆引きする解析・生成方式
2. 複数の識別子をcapture groupで取得し、同じactionとstore引数だけをReplaceへ再利用する狭い正規表現
3. 現在のような特定minify名に依存する完全一致

単に`initialized`、`fetched`、`current()`だけへMatchを広げる方式は、同じbundle内の別actionにも多数存在するため採用しません。`/v1/threads`だけへの文字列一致も、APIクライアント定義を捕捉するだけでstore更新actionを特定できないため不十分です。

識別子をcapture group化する場合でも、少なくとも次の連続した意味を同一action内で確認します。

```text
store状態が initialized または fetched
  → 同じstore引数の current()
  → watch.comment.nvComment.server
  → watch.video.id
  → watch.comment.nvComment.params
  → action引数のadditionals
  → POST /v1/threadsの結果でstore更新
```

### 汎化版へ切り替える条件

次をすべて満たすまで現行Matchを広げません。

1. プロキシーを無効化した公式原本captureを3版以上記録する。
2. 少なくとも1版で、現在依存しているminify名またはchunk名が実際に変化している。
3. 汎化候補が各履歴の対象actionへちょうど1回一致する。
4. 同じcapture内の他の全JavaScriptでは一致数が0である。
5. Replace後の全対象資産をde-minify・構文解析できる。
6. `FilterMatomeCommentApi`が1回だけ注入され、元のMatchが残らない。
7. 最新版で`verify-current-comment-reload.ts`が成功する。
8. 0件または複数件一致時は置換せず、comment-filter2が自動再読み込みせずハード再読み込み手順を通知する。

## 履歴追加テンプレート

公式資産を再取得するたび、この文書へ次を追記します。

```markdown
### YYYY-MM-DD: <変更の要約>

| 項目 | 観測値 |
| --- | --- |
| capture | `captures/<UTC timestamp>/` |
| 取得日時 | `<ISO 8601>` |
| Chrome | `<version>` |
| 取得経路 | `--no-proxy-server`による公式原本 / NicoCache_nl変換後 |
| 資産 | `<asset name>` |
| SHA-256 | `<hash>` |
| サイズ | `<bytes>` |
| Match | `<regex>` |
| Match一致数 | `<count>` |
| 一致開始オフセット | `<監査用。Matchには使わない>` |
| 置換後構文検証 | 成功 / 失敗 |
| 動的検証 | 成功 / 失敗 / 未実施 |

- 前版から変わった点:
- 前版から変わらなかった点:
- 再取得actionと判断した意味上の根拠:
- 汎化候補へ追加できる観測:
- まだ一般化できない仮説:
```

取得物そのものはGitへ追加せず、秘密情報や個人情報も記録しません。履歴には再現に必要なメタデータと最小限の正規化済み断片だけを残します。
