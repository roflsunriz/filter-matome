# 公式バンドル研究用スクリプト

`scripts/sandbox/` は、`src/sandbox/` に隔離する公式公開バンドルをraw CDPで取得し、外部通信を遮断した一時BrowserContextを検証し、静的解析と対象を限定した隔離実行を行うための開発者向けツールです。

## スクリプト

- `capture-official-watch-bundle.ts`: `http://127.0.0.1:9222` のChrome DevTools Protocolへ直接接続し、一時タブでwatchページが読み込んだ `resource.video.nimg.jp/web/scripts/nvpc_next/assets/` の公式JavaScriptと、そこから参照される同一CDNのES Module依存関係だけを `src/sandbox/official-watch-bundle/` へ保存する。依存関係の取得にはCookieを送らない。
- `verify-offline-cdp-sandbox.ts`: 一時BrowserContextのHTTP、HTTPS、WebSocket、FTPを遮断し、CookieとWeb Storageが空であることを確認する。
- `analyze-official-watch-bundle.ts`: 最新captureを実行せず、機能語と参照ドメインだけを集計する。
- `observe-membership-context.ts`: 既存ログインセッションとCookieを継承しない一時BrowserContextで同じwatchページを開き、個人識別子を保存せず会員区分と動画権利フラグだけを比較する。
- `observe-seek-preview.ts`: 同じBrowserContextの一時タブで公式シークバーをホバーし、query stringと個人識別子を除外してStoryboardの取得経路、数値メタデータ、表示結果を記録する。
- `run-offline-membership-sandbox.ts`: 公式CDNから隔離済みのES Modulesをloopbackだけ許可した一時BrowserContextで実行し、実コードの会員分岐を比較する。
- `run-offline-seek-preview-sandbox.ts`: 外部通信を遮断した一時BrowserContextで公式Storyboardモデルとレンダラーを実行し、時刻からスプライトセルへの変換とCSS描画を確認する。
- `raw-cdp-client.ts`: 各スクリプトで共有する、依存パッケージを使わないCDP WebSocketクライアント。

## 実行

起動済みChromeが `--remote-debugging-port=9222` を公開していることを確認してから、`local/features/` で実行します。

```powershell
bun run sandbox:capture-official
bun run sandbox:observe-membership
bun run sandbox:observe-seek-preview
bun run sandbox:run-membership
bun run sandbox:run-seek-preview
bun run sandbox:verify-offline
bun run sandbox:analyze-official
```

取得処理は既存タブを遷移させません。ログイン済みブラウザーで表示した結果から、公式watchアセットCDNの `.js` 本文だけを保存します。NicoCache_nlが `www.nicovideo.jp/local/` として配信するスクリプト、HTML、Cookie、Authorization、全ヘッダー、DOM、スクリーンショットは保存しません。

## 検証

```powershell
bun run sandbox:type-check
bun run lint
```

スクリプトを変更または実行する前にこの文書と `src/sandbox/README.md` を確認してください。公式コードを製品へimportせず、取得物をGit管理や配布物へ含めないでください。
