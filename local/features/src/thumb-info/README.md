# thumb-info プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/thumb-info/
├── index.html                            # HTMLページ・エントリーポイント (7.0KB)
├── main-controller.ts                    # メインコントローラー・初期化管理 (7.7KB)
├── video-info-handler.ts                 # 動画情報取得・表示処理 (12KB)
├── comment-handler.ts                    # コメント取得・表示処理 (14KB)
├── api-util.ts                          # API通信ユーティリティ (2.7KB)
├── shared-utils.ts                      # 共通ユーティリティ関数 (5.5KB)
└── styles.ts                            # CSSスタイル定義 (6.3KB)
```

## 🏗️ アーキテクチャ概要

### データフロー
```
ニコニコ動画API
    ↓ (サムネイル情報取得)
api-util.ts ─── データ取得・エラーハンドリング
    ↓
video-info-handler.ts ─── 動画情報解析・UI表示
    ↓
index.html ─── ユーザーへの情報表示
```

### コメント処理フロー
```
ユーザー操作
    ↓ (コメント取得ボタン)
main-controller.ts ─── イベント制御
    ↓
comment-handler.ts ─── common.tsを使用してコメント取得
    ↓
コメント解析・UI生成 ─── 詳細表示・コピー機能
    ↓
index.html ─── コメント一覧表示
```

### 初期化・制御フロー
```
index.html (DOMContentLoaded)
    ↓
main-controller.ts ─── アプリケーション初期化
    ↓
shared-utils.ts ─── videoId取得・UI作成
    ↓
styles.ts ─── スタイル適用
    ↓
各ハンドラー初期化 ─── 機能別処理開始
```

## 📋 各ファイルの役割詳細

### 🎯 **コア・エントリーポイント**

#### `index.html` - HTMLページ・UI構造
- **役割**: アプリケーションの表示基盤・UIテンプレート
- **機能**: HTML構造定義、動画情報表示エリア、コメント表示エリア、ボタン配置
- **編集タイミング**: UI構造変更、新しい表示項目追加、レイアウト変更

#### `main-controller.ts` - メインコントローラー
- **役割**: アプリケーション全体の初期化・制御・統合
- **機能**: 各ハンドラー管理、イベントリスナー設定、グローバル関数設定、初期化フロー制御
- **編集タイミング**: システム全体の挙動変更、新機能統合、初期化ロジック変更

### 🎨 **データ取得・処理**

#### `video-info-handler.ts` - 動画情報処理 (最も複雑なファイル)
- **役割**: ニコニコ動画のサムネイル情報取得・解析・表示
- **機能**: サムネイルAPI呼び出し、XMLデータ解析、UI要素更新、コピー機能、チャンネル/ユーザー情報処理
- **編集タイミング**: 動画情報表示変更、新しい情報項目追加、API仕様変更対応

#### `comment-handler.ts` - コメント処理 (最も大きなファイル)
- **役割**: コメントデータ取得・解析・表示・操作
- **機能**: common.ts連携、コメント一覧表示、詳細展開機能、統計情報表示、コピー機能
- **編集タイミング**: コメント表示機能変更、新しいコメント情報追加、フィルタリング機能追加

### 🔌 **ユーティリティ・サポート**

#### `api-util.ts` - API通信ユーティリティ
- **役割**: 純粋なAPI通信・データ変換機能
- **機能**: fetch関数ラッパー、エラーハンドリング、クリップボードコピー、共通API呼び出し
- **編集タイミング**: API仕様変更対応、新しいエンドポイント追加、通信エラー対応改善

#### `shared-utils.ts` - 共通ユーティリティ
- **役割**: プロジェクト内で共有される汎用関数集
- **機能**: videoId取得、DOM操作、時間計算、推定処理時間計算、UI作成ヘルパー
- **編集タイミング**: 共通機能追加、ユーティリティ機能拡張、videoId取得ロジック変更

### 🎨 **スタイル・デザイン**

#### `styles.ts` - CSSスタイル定義
- **役割**: アプリケーション全体のスタイル・デザイン
- **機能**: レスポンシブデザイン、ダークモード対応、Material Iconsスタイル、コンポーネント別スタイル
- **編集タイミング**: デザイン変更、新しいUIコンポーネント追加、レスポンシブ対応改善

## 🎯 目的別編集ガイド

### 💡 **新しい動画情報項目を追加したい**
1. `video-info-handler.ts` - データ取得・解析ロジック追加
2. `index.html` - 表示エリア・HTML要素追加
3. `styles.ts` - 新要素のスタイル追加
4. `api-util.ts` - 必要に応じてAPI呼び出し処理追加

### 🎬 **コメント表示機能を改善したい**
- **メイン対象**: `comment-handler.ts` - 表示ロジック・UI生成
- **補助対象**: `index.html` - HTMLテンプレート、`styles.ts` - スタイル

### 🔄 **新しいAPI連携を追加したい**
1. `api-util.ts` - 新しいAPI関数追加
2. 該当ハンドラー (`video-info-handler.ts` or `comment-handler.ts`) - データ処理追加
3. `main-controller.ts` - 必要に応じて制御ロジック追加

### 🎨 **UIデザインを変更したい**
1. `styles.ts` - CSSスタイル変更・追加
2. `index.html` - HTML構造変更
3. 各ハンドラー - 必要に応じてDOM操作変更

### ⚙️ **初期化・制御フローを変更したい**
- **メイン対象**: `main-controller.ts` - 初期化順序・制御ロジック
- **補助対象**: `shared-utils.ts` - ユーティリティ関数

### 📱 **videoId取得方法を改善したい**
- **メイン対象**: `shared-utils.ts` - videoIdUtils関数群
- **連携対象**: `main-controller.ts` - 初期化ロジック

### 🐛 **エラーハンドリングを改善したい**
1. `api-util.ts` - API通信エラー処理
2. 各ハンドラー - 機能別エラー処理
3. `main-controller.ts` - 全体的なエラー制御

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべき依存関係**
- **common.ts**: コメント取得で使用 - `window.commonHelper.fetchNicoDataWithComments()`
- **Material Icons**: アイコン表示で使用 - `createMaterialIcon()`
- **toastr**: 通知表示で使用 - `window.toastr`
- **logger**: ログ出力で使用 - `window.logger`

### 🚨 **変更時の影響範囲**
- `api-util.ts` 変更 → 全API通信に影響
- `shared-utils.ts` 変更 → 全ユーティリティ機能に影響
- `main-controller.ts` 変更 → システム全体の初期化・制御に影響
- `styles.ts` 変更 → 全UIデザインに影響

### 📝 **コーディング規約**
- グローバル関数は `window.*` で定義・アクセス
- デバッグログは `window.logger?.debug/info/warn/error` を使用
- エラーハンドリングは必須（特にAPI通信）
- Material Icons使用時は適切なオプション指定

### 💻 **ブラウザ互換性**
- Modern Browser対応（ES6+）
- Clipboard API対応（fallbackあり）
- CSS Grid・Flexbox使用
- ダークモード対応

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// グローバル関数確認
window.setCurrentVideoId
window.startCommentProcessingWithVideoId
window.copy_ext

// API関数確認
window.apiUtils.getApiData
window.apiUtils.copyToClipboard

// common.ts連携確認
window.commonHelper.fetchNicoDataWithComments('sm12345678')
```

### 主要なデバッグポイント
- videoId取得: `shared-utils.ts` の `videoIdUtils.getBestVideoId()`
- API通信: `api-util.ts` の各API関数
- データ解析: 各ハンドラーのデータ処理部分
- UI更新: DOM操作部分

### テスト用videoId
- 公開動画: `sm9` (新豪血寺一族)
- 最新動画: ニコニコ動画の人気動画から取得

## 🚀 開発・拡張のヒント

### 新機能追加の基本フロー
1. `shared-utils.ts` でユーティリティ関数追加
2. 該当ハンドラーで機能実装
3. `main-controller.ts` で統合・制御
4. `index.html` でUI追加
5. `styles.ts` でスタイル適用

### パフォーマンス改善ポイント
- **API通信**: `api-util.ts` でキャッシュ機能追加
- **DOM操作**: 大量要素生成時の仮想DOM活用
- **画像読み込み**: lazy loading対応

### セキュリティ考慮事項
- XSS対策: `textContent` 使用、innerHTML避ける
- API通信: 適切なヘッダー設定
- 外部リソース: Content Security Policy考慮

この文書を参考に、効率的に thumb-info プロジェクトを編集・拡張できます！ 