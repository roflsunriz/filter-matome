# movie-info ダッシュボード

## 📌 概要

`movie-info` は NicoCache_nl が扱う動画IDを基に、関連する複数の API から情報を集約して俯瞰できるダッシュボードです。以下のデータソースを横断的に確認できます。

- `https://www.nicovideo.jp/cache/info/v2?` から取得するキャッシュ情報
- `https://ext.nicovideo.jp/api/getthumbinfo/` から取得するサムネイル情報
- `https://www.nicovideo.jp/cache/mediainfo?` から取得する MediaInfo JSON
- `window.commonHelper.fetchWatchPage` が返す `apiData`
- ユーザー操作時にのみ取得する `window.commonHelper.fetchNicoDataWithComments` のコメント統合データ

コメントデータは件数が多く処理コストも高いため、専用ボタンを押した時だけ取得します。取得後は全フォークを統合したプレビュー (先頭 200 件) 表示と、フォーク別 `threads` を含むフル JSON ダウンロードを切り替えられます。

## 🏗 フォルダ構成

```
movie-info/
├── index.html              # Vite エントリーポイント
├── index.ts                # 初期化ロジックと UI 制御
├── api-clients.ts          # 各種 API 通信ラッパー
├── styles.ts               # ダッシュボード用スタイル適用
├── ui.ts                   # パネル管理クラス (コピー/ダウンロード制御)
├── types.ts                # ダッシュボード専用の型定義
└── README.md
```

## 🔄 データ取得フロー

1. 可能であれば `window.commonHelper.getVideoIdWithFallback()` で動画IDを自動検出
2. 「データ取得」ボタン、もしくは初期化時の自動検出で以下の API を並列に呼び出し
   - ウォッチページ (`fetchWatchPage`) から apiData
   - cache/info/v2
   - ext-thumb API
   - MediaInfo JSON
3. 結果ごとに `PanelController` がステータス/サマリー/Raw JSON を更新
4. コメントは「コメントを取得」ボタン押下時だけ `fetchNicoDataWithComments` を利用
   - 取得可能な全フォークを統合してプレビュー表示
   - プレビュー用 JSON は先頭 200 件のみ格納
   - フルデータはボタンからダウンロード可能

## ✨ UI のポイント

- 各パネルは `PanelController` が担当し、コピー/ダウンロード/生 JSON 表示を一括管理
- サマリー表示は `summary-grid`、`tag-list` などの簡潔なレイアウトで横断比較しやすく
- コメントパネルは取得前後でステータスと操作ボタン状態が切り替わる
- 共通ヘッダーは画面上端・左右端に接地し、固定解像度前提のオフセットなしで折り返す

## 🧩 拡張方法

- 新しい API を追加する際は `api-clients.ts` に通信処理を集約
- サマリー表示を増やす場合は `index.ts` 内の `build*Summary` 系関数を拡張
- 大量データ表示が必要な場合は `PanelController` のプレビュー/ダウンロード分離を再利用

## ✅ 動作確認

TypeScript ファイルを変更した場合は以下を実行し、エラーが出たら修正してください。

```
bun run lint
bun run type-check
bun run build
```

ビルドは `local/features/` で実行します。個別ビルドは `bun run build:movie-info` を利用できます。
