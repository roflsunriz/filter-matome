# nlMovieFetcher 現行仕様（Domand/CMAF）

最終実測: 2026-08-06、Chrome 150 headless、`https://www.nicovideo.jp/watch/sm9`

## 調査元と再現性

- 旧配布物は [nicocache.jpn.orgのサブディレクトリミラー](https://nicocache.jpn.org/third/) のファイルID `160`、`nlMovieFetcher 230716 o_O.7z`。SHA-256は `F1F8AA2275CDD426E5C46E563925A78540BCFFF389A1E2CF02AC6A833BA2AA73`。
- 現行NicoCache_nlは [nicocache.jpn.org](https://nicocache.jpn.org/) の2026-07-24版（ファイルID `29`）。SHA-256は `CD4FF1D7DBDB95D9E54EB981E2196967B7155BC1B406699F435322833E920979`。
- 旧配布物に明示的な再配布・改変ライセンスを確認できなかったため、旧ソースは移植せず、通信契約だけを比較してクリーン実装した。
- 隔離プロファイルのheadless Chromeへraw CDPで接続し、`scripts/sandbox/capture-official-watch-bundle.ts` と `observe-quality-delivery.ts` を使用した。匿名化済み観測結果はGit管理外の `src/sandbox/official-watch-bundle/captures/` に保存した。

```powershell
cd local/features
bun scripts/sandbox/capture-official-watch-bundle.ts `
  --cdp=http://127.0.0.1:9223 --url=https://www.nicovideo.jp/watch/sm9
bun scripts/sandbox/observe-quality-delivery.ts `
  --cdp=http://127.0.0.1:9223 --url=https://www.nicovideo.jp/watch/sm9
```

Cookie、`accessRightKey`、署名付きクエリー、ユーザーID、視聴履歴は観測成果物へ保存しない。

## 旧実装との差分

230716版は `media.delivery.movie.session` のDMCセッションと、音声を内包する単一HLSを前提にしている。現行レスポンスは `media.domand` を使用し、アクセス権APIが返すマスタープレイリストから映像と音声を別々のmedia playlistとして取得する。各playlistには `EXT-X-MAP`、`EXT-X-KEY`、暗号化CMAF断片が含まれる。

旧実装のDMCセッション生成、単一子playlistの走査、旧mylist/deflist/video.array API、2015〜2022年のDOMセレクターは利用しない。

## Watch API

ブラウザーのログインCookieを利用して同一オリジンから呼び出す。ログイン中は通常版を使用する。

```http
GET /api/watch/v3/{videoId}?_frontendId=6&_frontendVersion=0&actionTrackId={random}_{epochMs}&t={epochMs}
X-Frontend-Id: 6
X-Frontend-Version: 0
```

未ログインの隔離プロファイルでは通常版がHTTP 400 `UNAUTHORIZED`、ゲスト版がHTTP 200になった。したがって通常版を先に呼び、HTTP 401またはHTTP 400 `UNAUTHORIZED`の場合だけ、同じqueryとheaderで`/api/watch/v3_guest/{videoId}`へフォールバックする。ログイン中にゲスト版を固定使用するとHTTP 400 `FORBIDDEN`になる環境があるため、認証状態を無視してゲスト版へ固定しない。

2026-08-07のサーバー側再確認では、ブラウザー外から同じWatch APIを直接呼ぶとHTTP 406のHTMLになる経路があった。smartFetcherは通常版・ゲスト版のJSON交渉を優先し、JSONを取得できない場合だけ、同じ保存Cookieで`/watch/{videoId}`を取得してHTMLエスケープ済みの`meta[name="server-response"]`を復元する。本文、Cookie、`accessRightKey`はログへ出さず、復元後も下記と同じ最小フィールドとホスト制限を適用する。2026-08-07の公開`sm9`で、このフォールバックからaccess-rights APIの署名済みDomand URLまで到達することを、ダウンロードを開始しないプローブで確認した。

使用する最小フィールドは次のとおり。

```ts
interface WatchResponse {
  client?: { watchTrackId?: string };
  media?: {
    domand?: {
      accessRightKey?: string;
      videos?: Array<{ id: string; isAvailable: boolean; qualityLevel?: number; bitRate?: number }>;
      audios?: Array<{ id: string; isAvailable: boolean; qualityLevel?: number; bitRate?: number }>;
    };
  };
}
```

`isAvailable=true` の候補から `qualityLevel`、次に `bitRate` が最大の映像・音声を1組選ぶ。2026-08-06の `sm9` では映像2候補（360p、低画質）と音声2候補（128kbps、64kbps）を観測した。

## access-rights API

```http
POST https://nvapi.nicovideo.jp/v1/watch/{videoId}/access-rights/hls?actionTrackId={watchTrackId}
Content-Type: application/json
X-Access-Right-Key: {media.domand.accessRightKey}
X-Frontend-Id: 6
X-Frontend-Version: 0
X-Request-With: https://www.nicovideo.jp

{"outputs":[["video-h264-360p","audio-aac-128kbps"]]}
```

Java拡張は署名済みURLをNicoCache_nl自身のHTTPプロキシーへ渡す。HTTPSの
CONNECT後に返るサイト証明書は`nicocache.userDataRoot/certs/ca.cer`を信頼元として
検証し、ホスト名検証は無効化しない。これによりDomandのリクエストを本体の
キャッシュ処理へ通しつつ、JVM既定ストアにローカルCAがない環境でも接続できる。
配信playlistと断片には`Origin: https://www.nicovideo.jp`と同サイトの`Referer`を付ける。
`/start`へブラウザーが自動送信するCookieのうち、配信URLにも適用される
配信用の`domand_bid`だけを転送する。認証用`nicosid`や検索設定など他のCookieは
転送しない。値をAPIレスポンスやログへ出力してはならない。
実測ではCookieなしの署名URL取得は403、ブラウザーの同一コンテキストでは200だった。

成功時の `data.contentUrl` は `https://delivery.domand.nicovideo.jp/{hlsbid|shlsbid|hlsext}/...m3u8`。このPOSTをNicoCache_nl経由で行うことで、現行 `CmafCachingProcessor` が動画IDとマスターURLを関連付ける。

実測したmasterは `EXT-X-STREAM-INF` の映像URIと `EXT-X-MEDIA:TYPE=AUDIO` の音声URIを別に持つ。media playlistはtarget duration 6秒、映像54断片・音声54断片だった。実装は個数を固定せず、相対URIを基準URLで解決し、`EXT-X-MAP`、`EXT-X-KEY`、コメントでない全行を重複排除して取得する。2026-08-06の再実測では、media playlist内の110リソースが`delivery.domand.nicovideo.jp/cache/file/{識別子}//audio/*.cmfa`または`.../video/*.cmfv`を使用した。Java拡張はこの固定ホスト・固定パス形状だけを追加許可し、任意の外部URLは引き続き拒否する。

## nlMovieFetcherローカルAPI

すべて同一オリジンで、`X-Filter-Matome-Movie-Fetcher: 1` が必須。URLだけを直接開いた場合は404にする。

- `GET /cache/filter-matome/v1/movie-fetcher/capabilities`
- `POST /cache/filter-matome/v1/movie-fetcher/start` — `{"videoId":"sm9","contentUrl":"https://delivery.domand.nicovideo.jp/..."}`
- `GET /cache/filter-matome/v1/movie-fetcher/status?videoId=sm9`
- `POST /cache/filter-matome/v1/movie-fetcher/cancel` — `{"videoId":"sm9"}`
- `POST /cache/filter-matome/v1/movie-fetcher/report` — watch/access-rights APIなど、ブラウザー側で取得処理が止まった場合の短いエラー報告

状態は `idle | queued | fetching | canceling | canceled | completed | failed`。`completed` と `total` は子playlistとCMAFリソースの取得数、`bytesTransferred`は帯域制御とsmartFetcherの完了判定に使う実転送量である。開始・終了時刻は利用側が管理するため返さない。

GUI起動時は本体の拡張ロガーAPIでNicoCacheGUIへ`nlMovieFetcher`専用タブを追加する。受付、watch/access-rights APIのブラウザー側失敗、playlist数、CMAFリソース数と進捗、完了・中止・失敗理由を動画ID単位で記録する。ブラウザー報告は160文字へ制限し、URLを省略する。署名付きURL、Cookie、`accessRightKey`はログへ出力しない。GUIを使用しない場合も同じ内容を通常ログへ出力する。

拡張は受け付けるURLを、現行実測で使用されるHTTPSの `delivery.domand.nicovideo.jp` に制限する。`hlsbid`、`shlsbid`、`hlsext`のplaylistと、上記`/cache/file/`形状のCMAFリソースだけを許可し、旧形式との互換目的のホスト・汎用パス許可は持たない。署名付きURLはメモリー内だけで扱い、レスポンスやログへ出さない。通信は `listenPort`（既定8080）のNicoCache_nl自身へHTTPプロキシー接続し、復号、キャッシュ名、完了処理を本体の `CmafCachingProcessor` に委譲する。

## 一覧カードのDOM境界

2026-08-06の公式検索カードと保存済みfixtureで、クラス名ではなく次を安定境界として確認した。

- `a[href^="/watch/"]`
- `[data-anchor-href^="/watch/"]`
- `[data-decoration-video-id]`
- カード候補の `[data-group]`、`article`、`li`

SPA追加は `MutationObserver` で処理し、同一カードへボタンを重複追加しない。表示文言は文書言語に応じて切り替え、右から左の言語でも論理方向プロパティで配置する。
