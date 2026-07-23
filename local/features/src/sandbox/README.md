# sandbox

外部Webアプリの公開配布物を調査するときに、プロダクションコードと分離して扱うための領域です。ここで得た外部コードを `features.js` へ取り込まず、確認できたAPI契約だけを型・テスト・実装へ移します。

## 公式視聴ページのコメント投稿調査

- `download-official-watch-bundle.ps1`: 認証Cookieを渡さずに公開視聴ページと参照JavaScriptを `official-watch-bundle/` へ取得します。
- `../../scripts/sandbox/capture-official-watch-bundle.ts`: 起動済みChromeのraw CDPへ接続し、調査専用タブで実際に読み込まれた公式JavaScriptだけを取得します。Cookie、リクエストヘッダー、HTMLは保存しません。
- `../../scripts/sandbox/analyze-official-watch-bundle.ts`: 取得物を実行せず、機能語と参照ドメインを静的集計します。
- `../../scripts/sandbox/verify-offline-cdp-sandbox.ts`: 一時BrowserContextを作り、CDPでHTTP、HTTPS、WebSocket、FTPを遮断し、CookieとWeb Storageも空であることを検証します。
- `comment-post-api.md`: 2026-07-19に取得した公式バンドルから確認したコメント投稿契約です。
- `feature-differentiation.md`: raw CDP captureと外部通信遮断下の静的集計から、公式機能とfilter-matomeの差別化軸を整理した調査結果です。
- `official-watch-bundle/`: ダウンロードしたHTML・JavaScriptの隔離先です。期限付きキーやトラッキング値を含む可能性があるためGit管理外です。

```powershell
cd local/features/src/sandbox
./download-official-watch-bundle.ps1
```

ログイン済みChromeを `--remote-debugging-port=9222` 付きで起動済みの場合は、既存タブを変更せずに次の順で調査できます。実装はPlaywrightやChromeDriverを介さず、CDP WebSocketへ直接コマンドを送ります。

```powershell
cd local/features
bun run sandbox:capture-official
bun run sandbox:verify-offline
bun run sandbox:analyze-official
```

別のCDP endpointや動画を使う場合は、スクリプトへ直接引数を渡します。

```powershell
bun scripts/sandbox/capture-official-watch-bundle.ts `
  --cdp=http://127.0.0.1:9222 `
  --url=https://www.nicovideo.jp/watch/sm9
```

raw CDP取得はログイン済みセッションでページを表示しますが、保存するのは `resource.video.nimg.jp/web/scripts/nvpc_next/assets/` の `.js` レスポンス本文と、URL、サイズ、SHA-256、取得日時だけです。NicoCache_nlが `www.nicovideo.jp/local/` として配信するスクリプト、HTML、Cookie、Authorization、リクエスト・レスポンスヘッダー、DOM、スクリーンショットは保存しません。解析は `static-text-only` であり、公式JavaScriptをimport、eval、またはブラウザー実行しません。

実行時は次を守ってください。

- ログインCookie、ブラウザープロファイル、認証ヘッダーをスクリプトへ追加しない。
- ダウンロード物をコミット、配布、ビルド入力にしない。
- API契約を更新するときは、複数のバンドルをそのまま複製せず、URL、メソッド、必要フィールド、エラー分岐だけをこのディレクトリの調査メモへ反映する。
- 機能語の出現は実装や有効化の証明ではなく、不在も遅延ロードされた別バンドルに機能がない証明ではない。差別化判断には画面観察、API契約、既存実装を併用する。
- 調査後に不要なら `official-watch-bundle/` を削除してよい。再取得はスクリプトで行える。
