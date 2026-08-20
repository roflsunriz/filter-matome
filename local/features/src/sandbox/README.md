# sandbox

外部Webアプリの公開配布物を調査するときに、プロダクションコードと分離して扱うための領域です。ここで得た外部コードを `features.js` へ取り込まず、確認できたAPI契約だけを型・テスト・実装へ移します。

## 公式視聴ページのコメント投稿調査

- `download-official-watch-bundle.ps1`: 認証Cookieを渡さずに公開視聴ページと参照JavaScriptを `official-watch-bundle/` へ取得します。
- `../../scripts/sandbox/capture-official-watch-bundle.ts`: 起動済みChromeのraw CDPへ接続し、調査専用タブで読み込まれた公式JavaScriptと同一CDNのES Module依存関係を取得します。Cookie、リクエストヘッダー、HTMLは保存しません。
- `../../scripts/sandbox/analyze-official-watch-bundle.ts`: 取得物を実行せず、機能語と参照ドメインを静的集計します。
- `../../scripts/sandbox/analyze-comment-reload-api.ts`: 最新captureをメモリー上でde-minifyし、公式コメント再取得actionと`102_comment_reload_api.txt`の接続を検証します。
- `../../scripts/sandbox/analyze-comment-context-menu.ts`: 最新captureをメモリー上でde-minifyし、公式右クリックメニューのReact生成点と`103_official_comment_menu.txt`の接続を検証します。
- `../../scripts/sandbox/observe-membership-context.ts`: ログイン済みセッションと未ログインの一時BrowserContextを比較し、個人識別子を保存せず会員区分と動画権利フラグだけを記録します。
- `../../scripts/sandbox/observe-quality-delivery.ts`: ログイン済みセッションの一時タブで、個人識別子や認証情報を保存せず、画質・音質候補、access-rightsの組、HLS manifest、映像・音声セグメント分離を観測します。
- `../../scripts/sandbox/observe-seek-preview.ts`: 一時タブの公式シークバーへraw CDPでホバーし、query stringや個人識別子を保存せずStoryboardの取得経路、数値メタデータ、表示差を記録します。
- `../../scripts/sandbox/run-offline-membership-sandbox.ts`: 公式CDNから隔離済みのES Modulesをloopbackだけ許可した一時BrowserContextで実行し、外部通信を遮断したまま会員分岐を比較します。
- `../../scripts/sandbox/run-offline-quality-sandbox.ts`: 外部通信遮断下で公式の品質候補生成・選択関数を実行し、利用不可候補の除外、自動画質、上限指定時のフォールバックを確認します。
- `../../scripts/sandbox/run-offline-seek-preview-sandbox.ts`: 外部通信遮断下で公式Storyboardモデルとレンダラーを実行し、時刻からスプライトセルへの変換とCSS描画を確認します。
- `../../scripts/sandbox/verify-offline-cdp-sandbox.ts`: 一時BrowserContextを作り、CDPでHTTP、HTTPS、WebSocket、FTPを遮断し、CookieとWeb Storageも空であることを検証します。
- `../../scripts/sandbox/verify-current-comment-reload.ts`: Cookieのない一時BrowserContextで現行Watchページを開き、版付きAPI、`POST /v1/threads`、comment-filter2への再入力、ページ再読み込みがないことを動的検証します。
- `comment-post-api.md`: 2026-07-19に取得した公式バンドルから確認したコメント投稿契約です。
- `comment-reload-api.md`: 2026-07-23に取得した公式バンドルから確認した、公式ストアと描画を更新するコメント再取得契約です。
- `comment-reload-match-history.md`: 公式資産ごとのMatch、ハッシュ、意味上の安定点、変動点、汎化候補と採用条件を時系列で記録します。
- `comment-context-menu.md`: 描画中コメントの右クリック座標から公式コメントモデルとReactメニューへ至る契約です。
- `comment-context-menu-match-history.md`: 公式メニュー資産のMatch、ハッシュ、一致数、意味上の境界を時系列で記録します。
- `feature-differentiation.md`: raw CDP captureと外部通信遮断下の静的集計から、公式機能とfilter-matomeの差別化軸を整理した調査結果です。
- `membership-differentiation.md`: 未ログイン・一般・プレミアムの機能差と、チャンネル会員・PPVなど別軸の動画権利を整理した調査結果です。
- `quality-audio-delivery.md`: 画質・音質候補、会員別利用可否、access-rights、分離HLS配信、自動・手動切り替え、selected・loading・playing状態を整理した調査結果です。
- `seek-thumbnail-preview.md`: シークバーホバーのStoryboard取得、スプライト計算、表示条件、ローカルプレイヤーへの示唆を整理した調査結果です。
- `official-watch-bundle/`: ダウンロードしたHTML・JavaScriptの隔離先です。期限付きキーやトラッキング値を含む可能性があるためGit管理外です。

```powershell
cd local/features/src/sandbox
./download-official-watch-bundle.ps1
```

ログイン済みChromeを `--remote-debugging-port=9222` 付きで起動済みの場合は、既存タブを変更せずに次の順で調査できます。実装はPlaywrightやChromeDriverを介さず、CDP WebSocketへ直接コマンドを送ります。

```powershell
cd local/features
bun run sandbox:capture-official
bun run sandbox:observe-membership
bun run sandbox:observe-quality
bun run sandbox:observe-seek-preview
bun run sandbox:run-membership
bun run sandbox:run-quality
bun run sandbox:run-seek-preview
bun run sandbox:verify-offline
bun run sandbox:verify-comment-reload
bun run sandbox:analyze-official
bun run sandbox:analyze-comment-reload
bun run sandbox:analyze-comment-menu
```

別のCDP endpointや動画を使う場合は、スクリプトへ直接引数を渡します。

```powershell
bun scripts/sandbox/capture-official-watch-bundle.ts `
  --cdp=http://127.0.0.1:9222 `
  --url=https://www.nicovideo.jp/watch/sm9
```

raw CDP取得はログイン済みセッションでページを表示し、そこから参照される同一公式CDNのES Module依存関係も認証情報なしで巡回します。保存するのは `resource.video.nimg.jp/web/scripts/nvpc_next/assets/` の `.js` レスポンス本文と、URL、サイズ、SHA-256、取得日時だけです。NicoCache_nlが `www.nicovideo.jp/local/` として配信するスクリプト、HTML、Cookie、Authorization、リクエスト・レスポンスヘッダー、DOM、スクリーンショットは保存しません。通常の解析は `static-text-only` です。会員分岐の動的確認だけは、外部通信を遮断してloopbackから配信する隔離BrowserContextで、対象を限定した公式ES Moduleを実行します。

実行時は次を守ってください。

- ログインCookie、ブラウザープロファイル、認証ヘッダーをスクリプトへ追加しない。
- ダウンロード物をコミット、配布、ビルド入力にしない。
- API契約を更新するときは、複数のバンドルをそのまま複製せず、URL、メソッド、必要フィールド、エラー分岐だけをこのディレクトリの調査メモへ反映する。
- 機能語の出現は実装や有効化の証明ではなく、不在も遅延ロードされた別バンドルに機能がない証明ではない。差別化判断には画面観察、API契約、既存実装を併用する。
- 調査後に不要なら `official-watch-bundle/` を削除してよい。再取得はスクリプトで行える。
