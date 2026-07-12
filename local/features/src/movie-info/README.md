# movie-info ダッシュボード

## UIデザイン

ダッシュボードは `common/visual-theme.ts` の共通ダークトークンを使用します。情報源ごとの成功・失敗状態は意味を失わない専用色を維持し、通常の面、境界、文字、主操作は他プロジェクトと共通化します。

## HTML配信位置

- ソース: `src/movie-info/index.html`
- ビルド成果物: `dist/pages/movie-info/index.html`
- 配信URL: `https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html`

## 📌 概要

`movie-info` は NicoCache_nl が扱う動画IDを基に、関連する複数の API から情報を集約して俯瞰できるダッシュボードです。以下のデータソースを横断的に確認できます。

- `https://www.nicovideo.jp/cache/info/v2?` から取得するキャッシュ情報
- `https://ext.nicovideo.jp/api/getthumbinfo/` から取得するサムネイル情報
- `https://www.nicovideo.jp/cache/mediainfo?` から取得する MediaInfo JSON
- `window.commonHelper.fetchWatchPage` が返す `apiData`
- ユーザー操作時にのみ取得する `window.commonHelper.fetchNicoDataWithComments` のコメント統合データ

コメントデータは件数が多く処理コストも高いため、専用ボタンを押した時だけ取得します。取得後は全フォークを統合したプレビュー (先頭 200 件) 表示と、フォーク別 `threads` を含むフル JSON ダウンロードを切り替えられます。コメント取得は `bypassCommentFilter: true` を指定し、comment-filter2 の表示用フィルタを通さない元データを使います。

## 🏗 フォルダ構成

```
movie-info/
├── index.html              # 静的ページテンプレート
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
   - 一部の取得元が失敗した場合も成功したパネルは表示し、失敗元・原因・確認ポイントをエラーモーダルにまとめて表示
4. コメントは「コメントを取得」ボタン押下時だけ `fetchNicoDataWithComments` を利用
   - 取得可能な全フォークを統合してプレビュー表示
   - プレビュー用 JSON は先頭 200 件のみ格納
   - フルデータはボタンからダウンロード可能
   - comment-filter2 のフィルタ設定に左右されないよう、フィルタ前のコメントAPIレスポンスを取得

## ✨ UI のポイント

- 動画指定、基本4ソースの取得進捗、データソースタブ、選択中ソースの詳細を1つの調査ワークスペースへ集約
- 概要画面から各ソースの成功・失敗・未取得を確認し、そのまま詳細へ移動可能
- 各ソースのコピー/ダウンロード/生 JSON 表示を右側の共通位置へ配置し、データ内容と操作を分離
- 狭幅画面では操作領域を詳細の下へ移し、ステータス一覧とサマリーを1列へ再配置
- コメントは高コストな任意取得であることを動画入力欄とソース状態の両方で明示
- Watch APIの動画説明文はDOMPurifyで許可要素・属性を限定してHTML表示し、リンクには別タブ表示と`noopener noreferrer`を強制
- JSON・エラーモーダルはダイアログを開いた際に閉じるボタンへフォーカスし、終了後に元の操作へ復帰
- データ取得またはコメント取得が完遂しなかった場合は、原因が分かるエラーモーダルを表示
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

ビルドは `local/features/` で `bun run build` を実行します。全機能は単一バンドルへ統合されるため個別ビルドはありません。

動的UIの回帰テストは `tests/movie-info.spec.ts` にあり、以下で単独実行できます。

```
bunx playwright test tests/movie-info.spec.ts
```
