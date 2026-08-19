# features ソース構成

`local/features/src/` は、NicoCache_nlからニコニコ動画へ配信するブラウザー機能のソースです。`features.ts` がページ種別に応じて各機能を起動し、Bunの一括ビルドで単一バンドル、Worker、Service Worker、静的ページを生成します。

## ディレクトリ

| パス | 主な責務 |
| --- | --- |
| `api-info/` | NicoCache_nl・ニコニコ動画関連APIの仕様メモとレスポンス例 |
| `comment-filter2/` | コメント取得の捕捉、フィルタリング、設定UI |
| `common/` | 共通ヘッダー、APIクライアント、ログ、通知、動画ナビゲーション |
| `mlink-video-controller/` | 公式視聴ページの操作パネルと機能モジュール |
| `movie-info/` | キャッシュ・サムネイル・GPAC解析・視聴API情報の表示 |
| `mylist2/` | 独自マイリストSPA、永続化、Service Worker |
| `runtime/` | 配信ページ判定、起動境界、同期serverContext書き換え |
| `sandbox/` | 外部公開バンドルをプロダクションコードから隔離してAPI契約を調査する領域 |
| `types/` | グローバル型と機能横断の型定義 |
| `video-player/` | ローカルキャッシュ再生、コメント取得・描画・投稿、視聴ページルーター |
| `watch-history/` | 視聴履歴SPA、再生追跡、検索、統計、移行 |

## sandboxの境界

`sandbox/` のダウンロード物はAPI調査専用であり、`features.ts` からimportしません。公式コードのコピーを製品へ組み込まず、確認したHTTP契約を自前の型付きクライアントとモックテストへ移します。期限付きキー、Cookie、個人情報をコミットしないでください。

現在のコメント投稿調査では、公式視聴ページと依存JavaScriptを `sandbox/official-watch-bundle/` へ隔離し、`video-player/core/comment-poster.ts` に必要最小限の投稿フローだけを実装しています。再調査方法と確認済み契約は [sandbox/README.md](sandbox/README.md) を参照してください。

## 変更時の確認

- `common/`、`runtime/`、`types/`、`features.ts` は複数機能へ波及するため、利用元と関連テストをまとめて確認する。
- 外部API仕様を変更するときは、調査メモ、実装、モックテストの3点を同期する。
- `sandbox/official-watch-bundle/`、`dist/`、`test-results/` は生成・一時データとして手編集またはコミットしない。
- 標準検証は `local/features/` で `bun run format`、`bun run lint`、`bun run type-check`、`bun run test`、`bun run build` を実行する。
