# common

## 役割

複数プロジェクトが共有するブラウザー基盤です。`startCommon()` はCSS定数とトースト用スタイルを一度だけ適用し、各モジュールは必要な関数・クラスと互換用グローバルを提供します。

このディレクトリの変更はほぼすべての機能へ波及するため、利用元を検索してから編集してください。

## ファイル構成

- `common.ts`: 動画ID、ウォッチページ、コメント取得などの共通ヘルパー。`window.commonHelper` を公開。
- `header.ts`: 共通ヘッダーとナビゲーション。`window.NicoCommon` を公開。
- `logger.ts`: 共通ロガー。`window.logger` を公開。
- `toastr.ts`: 通知UI。`window.toastr` を公開。
- `notification-read-all.ts`: 公式CommonHeaderの通知パネルへ一括既読ボタンを追加し、公式通知一覧をページングして未読だけを制限付き並列で既読化する。
- `api-status-menu.ts`, `api-status-menu-styles.ts`: 公式CommonHeaderへ独立したfilter-matomeホバーメニューを挿入し、3つのnlFilter版付きAPIを型・版・実行マーカーから判定して表示する。
- `material-icons.ts`, `icon-assets.ts`: Material Design Iconsの生成、URL化、既存画像の置換。
- `css-constants.ts`, `visual-theme.ts`: 共通CSS変数とダークテーマトークン。
- `thumbnail-fallback.ts`: 欠落・読込失敗時の共通サムネイル。
- `server-response-parser.ts`: `server-response` メタ情報の安全な解析。
- `video-info-api.ts`: 旧ext-thumb XMLと現行Watch API JSONを共通の動画情報へ正規化するクライアント。
- `cache-search-client.ts`, `cache-search-results.ts`: NicoCache_nlキャッシュ検索と結果UI。
- `cache-info-api.ts`: 専用ホストREST APIのレスポンス検証、取得、完成判定、再生候補の優先順位。
- `cache-removal.ts`: NicoCache_nl本体の動画単位DELETE APIと削除予約結果の正規化。
- `video-navigation.ts`, `video-navigation-styles.ts`: 動画ID・URL入力とキャッシュ検索の共通UI。
- `indexed-db-emergency-backup.ts`: 破損したIndexedDBを再作成する前の緊急退避。
- `google-drive-backup-service.ts`: Google Identity Services、`drive.file`権限、ZIP圧縮を使う機能共通のGoogle Driveバックアップ基盤。
- `index.ts`: 共通副作用の起動入口。

## 設計境界

- APIクライアントはHTTPステータスだけでなく、NicoCache_nl固有のJSONエラー形式を正規化して返す。
- 動画IDは呼び出し元またはURLを優先し、`window.NicoCache_nl.watch` は型確認付きのフォールバックに限定する。
- DOMやAPIから得る `unknown` は、共通境界で検証してから機能固有型へ渡す。
- 公式通知の一括既読は、全ページのレスポンスと`nextUrl`を検証し終えてからPUTを開始し、公式API以外のURL、ページ循環、過大件数では何も変更せず停止する。
- nlFilter API状態メニューは生成class名や表示文言を挿入先判定に使わず、CommonHeader root、`/my`リンク、公式service linkという意味のある境界から位置を決める。公式Reactの再描画と競合しないよう`body`直下へfixed配置し、NicoCacheメニューがあればログイン時は左、未ログイン時のservice配置では右へ並べる。コメントメニューは公式React側の挿入コードが実行されるまで待機状態とする。
- 表示用HTML、動画説明、検索結果は、DOMPurifyまたはDOM APIで安全に組み立てる。
- アイコンは `material-icons.ts` のヘルパーを使い、各プロジェクトへSVGを重複埋め込みしない。
- Google Driveの保存フォルダー名、対象ファイル接頭辞、認証情報の保存キー、multipart boundary接頭辞は利用機能から明示し、サービス側に特定機能の既定値を持たせない。

## グローバル互換API

既存ページやNicoCache_nlのHTMLから利用されるため、次の名前を変更するときは全参照元を検索してください。

- `window.commonHelper`
- `window.NicoCommon`
- `window.logger`
- `window.toastr`

新規コードは可能な限り直接importし、グローバルはページ境界との互換用途に限定します。

## 変更時の確認

- 共通ヘッダー変更: 各静的SPAとニコニコ動画上のmlink表示を確認する。
- 動画ナビゲーション変更: movie-infoとvideo-playerを同時に確認する。
- 動画情報API変更: movie-info、mylist2、video-player、Service Worker、関連スクリプトを同時に確認する。
- キャッシュ検索・削除変更: video-player、mlink-video-controllerを確認する。
- テーマやアイコン変更: 狭幅、低高さ、高DPI、フォーカス表示、長い翻訳文を確認する。
- IndexedDB復旧変更: データを退避できない場合に無条件削除しないことを確認する。
- Google Drive変更: mylist2とwatch-historyのフォルダー・ファイル絞り込み、認証、ZIP入出力をまとめて確認する。

## テスト

- `tests/common-material-icons.test.ts`
- `tests/common-server-response-parser.test.ts`
- `tests/common-notification-read-all.test.ts`
- `tests/common-notification-read-all.spec.ts`
- `tests/common-api-status-menu.test.ts`
- `tests/common-api-status-menu.spec.ts`
- `tests/video-player-video-navigation.test.ts`
- `tests/video-player-cache-search.test.ts`
- `tests/video-info-api.test.ts`
- `tests/mlink-video-controller-cache-remove.test.ts`
- 各プロジェクトのPlaywrightテストに含まれる共通ヘッダー・テーマ・サムネイル確認

```powershell
cd local/features
bun run test:unit
bun run test
bun run type-check
bun run build
```
