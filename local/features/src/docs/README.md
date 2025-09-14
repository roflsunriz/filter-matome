# docs プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/docs/
├── comment-filter2/
│   ├── index.html                        # ドキュメントページ (20KB)
│   ├── index.ts                          # メインエントリーポイント (948B)
│   ├── main-styles.ts                    # メインCSSスタイル (6.3KB)
│   └── styles.ts                         # ベーススタイル (6.0KB)
└── mylist2/
    ├── index.html                        # ドキュメントページ (33KB)
    ├── index.ts                          # メインエントリーポイント (826B)
    └── styles.ts                         # 統合CSSスタイル (7.0KB)
```

## 🏗️ アーキテクチャ概要

### データフロー
```
共通モジュール (common/)
    ↓
ドキュメントページ (index.html)
    ↓
エントリーポイント (index.ts) ─── 共通ヘッダー初期化
    ↓
スタイル適用 (styles.ts) ─── ページスタイリング
    ↓
ユーザー向けドキュメント表示
```

### コンポーネント構成
```
index.html ─── HTMLコンテンツ・構造定義
    ↓
index.ts ─── 初期化・ヘッダー統合
    ↓
styles.ts ─── CSS統合・スタイル適用
    ↓
共通ライブラリ連携 (common/index.ts)
```

## 📋 各ファイルの役割詳細

### 🎯 **Comment Filter2 ドキュメント**

#### `comment-filter2/index.html` - ドキュメントページ
- **役割**: Comment Filter2の使用方法・設定説明
- **機能**: JSON Lines形式ルール説明、CSV形式説明、正規表現ガイド、コメントコマンド一覧
- **編集タイミング**: 機能追加・変更時、ルール形式変更時、使用方法変更時

#### `comment-filter2/index.ts` - エントリーポイント
- **役割**: ページ初期化・共通ヘッダー統合
- **機能**: スタイル適用、共通モジュール統合、ヘッダー初期化
- **編集タイミング**: 初期化ロジック変更、新機能統合

#### `comment-filter2/main-styles.ts` - メインスタイル
- **役割**: ドキュメント専用のメインCSSスタイル定義
- **機能**: レイアウト、カラーパレット、レスポンシブ対応、グリッドシステム
- **編集タイミング**: デザイン変更、新UIコンポーネント追加、レイアウト調整

#### `comment-filter2/styles.ts` - ベーススタイル
- **役割**: ヘッダー・基本スタイル統合
- **機能**: Material Icons統合、ヘッダー位置調整、カラー定義、基本レイアウト
- **編集タイミング**: ヘッダーデザイン変更、共通スタイル調整

### 🎨 **Mylist2 ドキュメント**

#### `mylist2/index.html` - ドキュメントページ
- **役割**: Mylist2の使用方法・機能説明
- **機能**: 機能一覧、基本操作ガイド、高度な機能説明、FAQ、技術詳細
- **編集タイミング**: 機能追加・変更時、操作方法変更時、新機能説明追加

#### `mylist2/index.ts` - エントリーポイント
- **役割**: ページ初期化・共通ヘッダー統合
- **機能**: スタイル適用、共通モジュール統合、ヘッダー初期化
- **編集タイミング**: 初期化ロジック変更、新機能統合

#### `mylist2/styles.ts` - 統合スタイル
- **役割**: Mylist2ドキュメント専用の全スタイル統合
- **機能**: Material Icons統合、ヘッダー調整、フィーチャーカード、レスポンシブデザイン
- **編集タイミング**: デザイン変更、新UIコンポーネント追加、レイアウト調整

## 🎯 目的別編集ガイド

### 💡 **新しい機能の説明を追加したい**
1. `index.html` - HTMLコンテンツに新機能説明を追加
2. `styles.ts` - 必要に応じて新しいスタイルを追加
3. Material Icons - 新アイコンが必要な場合は共通ライブラリを確認

### 🐛 **ドキュメントの内容を修正したい**
- **メイン対象**: `index.html`
- **補助対象**: 内容に応じてスタイル調整 (`styles.ts`)

### 🎨 **デザインをカスタマイズしたい**
1. **Comment Filter2**: 
   - `main-styles.ts` - メインデザイン変更
   - `styles.ts` - ベーススタイル・ヘッダー調整
2. **Mylist2**:
   - `styles.ts` - 統合スタイル変更

### 💾 **ヘッダー・共通部分を変更したい**
1. `index.ts` - ヘッダー設定変更
2. `styles.ts` - ヘッダー位置・スタイル調整
3. 共通ライブラリ (`common/`) - 共通機能変更

### 🔄 **新しいドキュメントプロジェクトを追加したい**
1. 新ディレクトリ作成 (`docs/新プロジェクト名/`)
2. `index.html` - ドキュメントコンテンツ作成
3. `index.ts` - エントリーポイント作成（既存を参考）
4. `styles.ts` - 専用スタイル作成
5. 共通ライブラリ統合

### 🚀 **パフォーマンスを改善したい**
- **CSS最適化**: `styles.ts` - 不要スタイル削除、統合
- **HTML最適化**: `index.html` - 構造最適化、画像最適化
- **JavaScript最適化**: `index.ts` - 初期化処理最適化

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべき依存関係**
- **共通ライブラリ**: `features/src/common/index.ts` (必須)
- **Material Icons**: Material Design Icons対応
- **ヘッダー機能**: `window.NicoCommon.createHeader` 利用

### 🚨 **変更時の影響範囲**
- `index.ts` 変更 → 初期化・ヘッダー機能に影響
- `styles.ts` 変更 → ページ全体のデザインに影響
- `index.html` 変更 → コンテンツ・構造に影響

### 📝 **コーディング規約**
- TypeScript: 型安全性を重視
- CSS: CSS Custom Properties活用でテーマ対応
- HTML: セマンティックHTML、アクセシビリティ対応
- デバッグログ: `window.logger?.debug/info/warn/error` を使用

## 🎨 スタイルシステム詳細

### Comment Filter2のスタイル構成
```typescript
// styles.ts
materialIconsStyles +           // Material Icons統合
HEADER_ADJUSTMENT_STYLES +      // ヘッダー位置調整
HEADER_STYLES +                 // ヘッダーデザイン
COLORS_STYLES                   // カラーパレット

// main-styles.ts
MAIN_STYLES_PART1 +             // メインレイアウト
MAIN_STYLES_PART2               // 詳細コンポーネント
```

### Mylist2のスタイル構成
```typescript
// styles.ts
materialIconsStyles +           // Material Icons統合
HEADER_ADJUSTMENT_STYLES +      // ヘッダー位置調整
MYLIST2_DOCS_STYLES            // 統合スタイル
```

### カラーパレット
- **プライマリ**: `#3498db` (Blue)
- **セカンダリ**: `#4dd0e1` (Cyan)
- **背景**: `#1a1a1a → #2d2d2d → #3498db` (Gradient)
- **カード背景**: `#2d2d2d`, `#424242`
- **テキスト**: `#ffffff` (Primary), `#b0bec5` (Secondary)

## 🔍 デバッグ・開発

### 開発時のベストプラクティス
1. **ライブリロード**: HTTPサーバーでの開発推奨
2. **ブラウザキャッシュ**: 開発時はキャッシュ無効化
3. **レスポンシブテスト**: 複数デバイスでの表示確認

### よくある問題と解決方法
- **共通ライブラリ読み込みエラー**: `common/index.ts` の読み込み順序確認
- **スタイル競合**: CSS詳細度・読み込み順序確認
- **Material Icons表示されない**: ネットワーク接続・パス確認

### デバッグ用アクセス
```javascript
// 共通モジュール確認
window.NicoCommon

// ログ出力
window.logger?.debug('デバッグ情報')
```

## 📚 関連ドキュメント

- **Comment Filter2 本体**: `features/src/comment-filter2/README.md`
- **共通ライブラリ**: `features/src/common/`
- **型定義**: `features/src/types/`

この文書を参考に、効率的にdocsプロジェクトを編集・拡張できます！ 