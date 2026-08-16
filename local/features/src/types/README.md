# types

## 役割

機能間で共有するデータ構造、ブラウザーグローバル、外部モジュール宣言を集約します。実行時の検証は行わないため、外部入力には型ガードやパーサーを別途用意してください。

## 構成

- `index.ts`: 共有型の公開入口。名前が衝突する型は別名で再エクスポートする。
- `global.d.ts`, `global-types.ts`: `window`、NicoCache_nl、ページ側グローバル。
- `common-types.ts`: 共通ヘッダー、ウォッチAPI、コメント取得などの境界。
- `database-types.ts`: IndexedDB、移行、バックアップの共通型。
- `comment-types.ts`, `filter-types.ts`: コメント応答とcomment-filter2ルール。
- `video-types.ts`, `video-player-bridge-types.ts`: 動画、プレイヤー、フィルター連携。
- `cache-info-types.ts`: NicoCache_nl `/cache/info/v3` の動画・キャッシュ実体。
- `mylist-types.ts`, `watch-history-types.ts`: 各永続データモデル。
- `cache-data-manager-types.ts`, `movie-info-types.ts`: 各ダッシュボードの入出力。
- `mlink-video-controller-types.ts`, `module-types.ts`, `background-image-types.ts`, `thumbnails-filter-types.ts`: mlinkのパネル・モジュール・設定。
- `ui-types.ts`, `icon-types.ts`, `toastr-types.ts`, `util-types.ts`: UIと共通ユーティリティ。
- `asset-modules.d.ts`, `flexsearch.d.ts`, `nico-common.d.ts`, `performance.d.ts`: 外部・アセット・環境宣言。

## 使い分け

- 複数機能で使う型は `@/types` または対象ファイルからimportする。
- 一つの実装内だけで完結する型は、その実装の近くへ置く。
- `Window` 拡張や外部宣言だけが必要な場合は `.d.ts` を使い、実行コードを置かない。
- 同名型をまとめて再エクスポートする場合は、`index.ts` で意味の分かる別名を付ける。
- APIレスポンスを型アサーションだけで信用せず、境界で `unknown` から絞り込む。

## データモデル変更

IndexedDBへ保存する型を変えるだけでは既存データは更新されません。次を一組として変更してください。

1. 型定義。
2. DBバージョンとスキーマ。
3. 旧データからのマイグレーション。
4. インポート・エクスポート形式。
5. 破損データの検証と復旧。
6. 境界値と旧バージョンのテスト。

フィールドを任意化して移行を省略する方法は、永続データの正規化には使用しません。

## 変更時の確認

- `rg "型名" src tests` で利用元を確認する。
- `index.ts` の公開有無と名前衝突を確認する。
- グローバル型を追加した場合は、実際にその値を設定するコードと失敗時の扱いを確認する。
- NicoCache_nlやニコニコ動画由来の型は、現在の実レスポンスまたは `api-info/` と照合する。

```powershell
cd local/features
bun run type-check
bun run lint
bun run test:unit
bun run build
```
