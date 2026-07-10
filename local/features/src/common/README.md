# common プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/common/
├── index.ts                              # startCommon()エントリーポイント
├── common.ts                             # API通信・データ取得ヘルパー (5.0KB)
├── header.ts                             # 共通ヘッダーコンポーネント (Shadow DOM版) (19KB)
├── logger.ts                             # ログ機能・デバッグ支援 (4.5KB)
├── indexed-db-emergency-backup.ts        # IndexedDB再作成前の緊急バックアップ
├── material-icons.ts                     # マテリアルアイコン統合ヘルパー (9KB)
├── toastr.ts                             # 通知システム・トースト表示 (19KB)
├── cache-removal.ts                      # キャッシュ情報取得・HLS削除処理
└── css-constants.ts                      # 共通CSS定数・スタイル定義 (1.7KB)
```

## 🏗️ アーキテクチャ概要

### 初期化フロー

```
features.ts ─── ページ判定
    └── startCommon() ─── スタイル適用
    ├── css-constants.ts ─── CSS変数定義
    ├── toastr.ts ─── 通知システム初期化
    ├── logger.ts ─── ログシステム初期化
    └── common.ts ─── グローバルヘルパー登録
```

### 機能フロー

```
各プロジェクト
    ├── header.ts ─── 統一ヘッダー表示
    ├── common.ts ─── API通信・データ取得
    ├── toastr.ts ─── ユーザー通知
    ├── logger.ts ─── デバッグ情報出力
    ├── cache-removal.ts ─── 完了済み/テンポラリHLSキャッシュ削除
    ├── indexed-db-emergency-backup.ts ─── IndexedDB緊急退避
    └── material-icons.ts ─── アイコン表示
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - エントリーポイント

- **役割**: 中央ルーターから呼ばれる共通機能の明示的初期化
- **機能**: CSS定数適用、toastrスタイル適用、各モジュールのimport
- **編集タイミング**: 新しい共通機能追加時、初期化順序変更時

#### `common.ts` - API通信・データ取得ヘルパー

- **役割**: ニコニコ動画APIとの通信を統一化
- **機能**:
  - `fetchRequest` - 共通fetch関数
  - `checkCache404` - キャッシュ存在確認
  - `fetchWatchPage` - 動画情報取得
  - `fetchNicoComments` - 取得可能な全フォークのコメントデータ取得
  - `fetchNicoDataWithComments` - 全フォークの `threads` と統合済み `comments` を含む統合データ取得
  - `fetchNicoComments`/`fetchNicoDataWithComments` は `{ bypassCommentFilter: true }` 指定時に comment-filter2 の fetch 差し替えを通さず、コメントJSON保存や movie-info 用のフィルタ前データを取得
  - `getVideoIdWithFallback` - SPA直後の古い `NicoCache_nl.watch` 状態より現在URL/入力URLの動画IDを優先して取得
  - `fetchWatchPage`/`fetchNicoComments` の短期メモリキャッシュ・同時リクエスト共有
- **編集タイミング**: API仕様変更対応、新しいエンドポイント追加

### 🎨 **UI・インターフェース**

#### `header.ts` - 共通ヘッダーコンポーネント (最も大きなファイル)

- **役割**: 全プロジェクト共通のニコニコ動画風ヘッダー
- **機能**:
  - Shadow DOM実装
  - 検索機能（キーワード・タグ・マイリスト等）
  - リンクナビゲーション
  - 固定モード対応
  - 画面上端・左右端に接地するフルブリード配置と折り返しによるレスポンシブ対応
- **編集タイミング**: ヘッダーデザイン変更、新しいリンク追加、検索機能拡張

#### `css-constants.ts` - 共通CSS定数

- **役割**: 全環境で統一的に使用するCSS変数定義
- **機能**:
  - ヘッダー位置調整定数
  - 色・サイズ・z-index定数
  - 各環境微調整値（固定解像度前提の負オフセットは避ける）
- **編集タイミング**: デザイン統一、新しいスタイル定数追加

#### `material-icons.ts` - マテリアルアイコン統合

- **役割**: マテリアルデザインアイコンの統一管理
- **機能**:
  - アイコンパス生成
  - SVGタグ生成
  - カラー・サイズ・スタイル設定
  - よく使うアイコンのショートカット
- **編集タイミング**: 新しいアイコン追加、アイコンスタイル変更

### 💬 **通知・ログ**

#### `toastr.ts` - 通知システム

- **役割**: ユーザーへの通知・メッセージ表示
- **機能**:
  - 成功・エラー・警告・情報通知
  - 位置・表示時間・アニメーション設定
  - プログレスバー・クローズボタン対応
- **編集タイミング**: 通知デザイン変更、新しい通知タイプ追加

#### `logger.ts` - ログ機能

- **役割**: デバッグ・エラー追跡・パフォーマンス測定
- **機能**:
  - 出力対象制御（WARN・ERROR のみ出力、DEBUG・INFO・LOG は互換メソッドとして保持）
  - ファイル別ログ有効/無効制御
  - 呼び出し元ファイル自動検出
  - パフォーマンス測定ヘルパー
- **編集タイミング**: ログ出力調整、新しいログ機能追加

## 🎯 目的別編集ガイド

### 💡 **新しい共通機能を追加したい**

1. 適切なファイルに機能実装（または新規ファイル作成）
2. `index.ts` - 新しい機能のimport追加
3. 必要に応じて `css-constants.ts` に定数追加
4. `src/types/common-types.ts` または `global.d.ts` に型定義追加

### 🌐 **新しいAPI通信機能を追加したい**

- **メイン対象**: `common.ts`
- **手順**:
  1. 新しいヘルパー関数を `window.commonHelper` に追加
  2. 型定義を `src/types/common-types.ts` に追加
  3. エラーハンドリング・ログ出力を含める

### 🎨 **ヘッダーをカスタマイズしたい**

1. **HTML構造変更**: `header.ts` の `getHeaderTemplate()` メソッド
2. **スタイル変更**: `header.ts` の `getHeaderStyles()` メソッド
3. **機能追加**: `header.ts` の `setupEventListeners()` メソッド
4. **位置調整**: `css-constants.ts` の位置調整定数

### 🔔 **通知機能をカスタマイズしたい**

1. **新しい通知タイプ**: `toastr.ts` の `notify()` メソッド
2. **スタイル変更**: `toastr.ts` の `TOASTR_STYLES` 定数
3. **アニメーション変更**: `toastr.ts` の `animate()` メソッド

### 🎯 **アイコンを追加・変更したい**

1. **新しいアイコン追加**: `material-icons.ts` の `ICONS` 定数
2. **アイコンスタイル変更**: `material-icons.ts` の `materialIconsStyles`
3. **ショートカット追加**: `material-icons.ts` の `commonIcons`

### 🐛 **ログ出力を調整したい**

- **特定ファイルのログ制御**: `logger.ts` の `initializeLoggerConfig()` メソッド
- **ログ出力**: `logger.warn()` / `logger.error()` を使用
- **新しいログタイプ追加**: `logger.ts` に新しいメソッド追加

### 💾 **型定義を更新したい**

- **共通型**: `src/types/common-types.ts`
- **グローバル型**: `src/types/global.d.ts`
- **アイコン型**: `src/types/icon-types.ts`
- **通知型**: `src/types/toastr-types.ts`

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**

- **共通機能追加時**: `index.ts` (初期化順序)
- **API関連変更時**: `src/types/common-types.ts` (型定義)
- **スタイル変更時**: `css-constants.ts` (CSS変数)
- **グローバル機能追加時**: `src/types/global.d.ts` (型定義)

### 🚨 **変更時の影響範囲**

- `index.ts` 変更 → 全プロジェクトの初期化に影響
- `css-constants.ts` 変更 → 全プロジェクトのスタイルに影響
- `common.ts` 変更 → APIを使用する全機能に影響
- `logger.ts` 変更 → 全プロジェクトのデバッグ機能に影響

### 📝 **コーディング規約**

- windowオブジェクトへの追加は慎重に行う
- Shadow DOM使用時は外部スタイルとの干渉に注意
- ログ出力は適切なレベルで行う
- 型定義は必ず更新する
- エラーハンドリングは必須

### 🔄 **互換性維持**

- 既存のwindowオブジェクトのプロパティは変更しない
- 公開APIの引数・戻り値の型は慎重に変更する
- CSS変数名は既存プロジェクトとの互換性を考慮

## 🔍 デバッグ・テスト

### コンソールからのアクセス

```javascript
// 共通ヘルパー関数
window.commonHelper.fetchWatchPage("sm9");
window.commonHelper.fetchNicoComments(apiData);

// ログ機能
window.logger.warn("警告メッセージ");
window.logger.error("エラーメッセージ");

// 通知システム
window.toastr.success("成功メッセージ");
window.toastr.error("エラーメッセージ");

// ヘッダー機能（CommonHeaderインスタンス）
window.NicoCommon.createHeader("container-id", config);
```

### 主要なグローバル要素

- `window.commonHelper` - API通信ヘルパー
- `window.logger` - ログ機能
- `window.toastr` - 通知システム
- `window.NicoCommon` - ヘッダー関連

### CSS変数の確認

```css
/* ブラウザの開発者ツールで確認可能 */
:root {
  --header-offset-top: 0;
  --header-width: 100%;
  --header-bg-color: #252525;
  --icon-size-medium: 20px;
  /* 他多数... */
}
```

## 🚀 パフォーマンス考慮事項

### 最適化ポイント

- **初期化**: `index.ts` での並列処理
- **API通信**: `common.ts` でのキャッシュ活用
- **ログ出力**: 本番環境での自動調整
- **アイコン**: lazy loading対応
- **通知**: メモリリーク防止

この文書を参考に、効率的にcommonプロジェクトを編集・拡張できます！
