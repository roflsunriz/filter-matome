# destroy-ads

ニコニコ動画の広告を、表示後のDOM削除やCSS非表示ではなく、公式資産が広告要素を生成する前と、NicoCache_nlが広告要求を上流へ送る前の2段階で止めます。

## 実行境界

1. `DestroyAds` Java extensionが既存`proxy.pac`のproxyポートを読み、広告ホストだけを同じNicoCache_nlへ通す管理ブロックを最終`DIRECT`の直前へ挿入する。初回変更前のPACは`proxy.pac.destroy-ads.bak`へ一度だけ保存し、既存ルールは維持する。
2. 同extensionの`Rewriter`が公式HTML・JavaScriptレスポンスをブラウザーへ渡す前に処理する。
   - 現行`Advertisement-*` ES ModuleのReact広告コンポーネントとFallbackを`null`化する。
   - `root-*`の`publicUrl.adsResource`ローダー関数を残し、base URLだけを同一originの空stubへ変更する。公式側が`/assets/js/ads2.js`を追加してload完了を待つ契約を維持しつつ、外部広告コードは実行しない。
   - `PlayerCurrentTime-*`の動画広告選択と自動再生prewarmは書き換えない。公式側が広告API・Prebidの失敗を処理して通常動画を開始するため、この経路を消すと再生も停止する。
   - `PlayerVolumeBar-*`の広告ブロック検査が生成するadsResource・IMA・OpenXローダーを、`Promise.allSettled`内の即時rejectへ置換する。
   - `bridge-*`のGoogle Tag Manager起動呼び出しを除去する。
   - 旧ページbundleの`Advertisement`マネージャーを利用不可に固定する。
   - 公式HTMLに直書きされた広告用`script`、`iframe`、`video`、`img`、`source`、`link`をブラウザーが解析する前に除去する。
3. 同extensionの`RequestFilter`が、残った広告要求をProcessorや外部接続より前に`DROP`する。
   - `ads.nicovideo.jp`、`api.nicoad.nicovideo.jp`、ニコニ広告の画像・動画・音声経路。
   - Google/DoubleClick、AdStir、Amazon APS、Amanad、PubMatic、Rubicon、Criteo、OpenX、MicroAdなど、実測した広告配信・入札・同期経路。
   - 通常の動画配信、コメント、Watch API、公式JavaScript本体は遮断しない。

`ad-request-policy.ts`と`asset-rewriter.ts`は、取得スクリプト、解析、単体テストでJava extensionと同じ境界を検証するための型付き正本です。公式コードやde-minify成果物は製品へimportしません。

## 主要ページ走査

`official-page-catalog.ts`は、トップ、動画トップ、新着、ランキング、検索、タグ、Watch、ユーザー投稿、シリーズ、公開マイリスト、履歴、フォロー中の12ページ種別を列挙します。`sandbox:capture-destroy-ads`はCookieを持たない隔離Chromeのraw CDPで順に開き、クエリー文字列と認証情報を保存せず、広告語を含む公式JS/CSSだけをde-minifyします。取得物は`sandbox/destroy-ads-captures/`に置き、Git管理・配布・ビルド入力にしません。

2026-08-24の未ログイン走査では、公開ページ10種で1ページあたり4〜196件の広告候補要求を観測しました。Watchでは860件中196件、検索では439件中127件、動画トップでは422件中124件でした。認証が必要な履歴とフォロー中はアカウントログインへ遷移し、広告候補要求はありませんでした。

```powershell
cd local/features
bun run sandbox:capture-destroy-ads -- --cdp=http://127.0.0.1:9222
bun run sandbox:analyze-destroy-ads
bun test tests/destroy-ads.test.ts tests/extension-logging.test.ts
```

## 更新時の条件

- 広告語の出現だけで遮断対象と断定しない。要求のinitiator、de-minifyした生成点、その後に発生した広告配信を対応付ける。
- minify識別子そのものへ依存せず、`publicUrl.adsResource`、公開export、GTM data layer、`Advertisement`能力判定という意味上の境界へ一致させる。
- `publicUrl.adsResource`の呼び出し自体を`void 0`や成功・失敗Promiseへ置き換えない。公式動画初期化はローダー関数のload完了契約に依存するため、ローカルstubのbase URLへ引数だけを変更する。
- 公式資産のMatchが外れた場合は対象レスポンスを改変しない。RequestFilterの上流遮断は維持し、一般ページを壊すワイルドカードへ広げない。
- URL規則を増やすときは、通常の動画・画像・コメント・APIを許可する負例を同時に追加する。
- 変更後はJava拡張が`DestroyAds.class`だけを生成することと、実ブラウザーのNetworkで広告要求が上流へ到達しないことを確認する。

## 無効化と復旧

完全に元へ戻す場合はNicoCache_nlを停止し、`DestroyAds.class`を取り除いてから、`proxy.pac.destroy-ads.bak`を`proxy.pac`へ戻します。その後NicoCache_nlとブラウザーを再起動します。バックアップを残したまま管理ブロックだけを手編集で消すと、次回起動時に現行規則が再挿入されます。

公式資産の版、SHA-256、一致結果は[match-history.md](match-history.md)に記録します。
