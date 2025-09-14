# types 型定義システム アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/types/
├── index.ts                              # エクスポート統合 (1.8KB)
├── core/
│   ├── global-types.ts                   # グローバルインターフェース (4.2KB)
│   ├── global.d.ts                       # グローバル宣言 (2.1KB)
│   └── common-types.ts                   # 共通API関連 (2.4KB)
├── features/
│   ├── filter-types.ts                   # フィルター機能 (7.4KB)
│   ├── comment-types.ts                  # コメント関連 (6.9KB)
│   ├── video-types.ts                    # 動画関連 (4.3KB)
│   ├── video-player-bridge-types.ts     # 動画プレイヤー連携 (2.0KB)
│   ├── mylist-types.ts                   # マイリスト (1.6KB)
│   ├── thumbnails-filter-types.ts       # サムネイルフィルター (1.1KB)
│   ├── background-image-types.ts        # 背景画像 (389B)
│   └── mlink-video-controller-types.ts  # リンク動画コントローラー (2.1KB)
├── ui/
│   ├── ui-types.ts                       # UI設定・コンポーネント (3.7KB)
│   ├── icon-types.ts                     # アイコン関連 (1.7KB)
│   └── toastr-types.ts                   # 通知システム (2.7KB)
├── system/
│   ├── database-types.ts                 # データベース (1.8KB)
│   ├── module-types.ts                   # モジュールシステム (2.6KB)
│   └── util-types.ts                     # ユーティリティ (614B)
└── environment/
    ├── vite-env.d.ts                     # Vite環境 (162B)
    ├── nico-common.d.ts                  # NicoCommon宣言 (469B)
    └── performance.d.ts                  # パフォーマンス拡張 (432B)
```

## 🏗️ アーキテクチャ概要

### 型定義の依存関係
```
index.ts ─── 全型定義のエクスポート統合
    ↓
global-types.ts ─── システム全体の基盤型定義
    ↓
common-types.ts ─── API・共通データ構造
    ↓
├── filter-types.ts ───┬─── comment-types.ts
├── video-types.ts ────┘
├── ui-types.ts
└── その他機能別型定義...
```

### 機能領域別の分類
```
【コア機能】─── グローバル基盤、共通API構造
【機能別】  ─── フィルター、コメント、動画、マイリスト等
【UI関連】  ─── ユーザーインターフェース、アイコン、通知
【システム】─── データベース、モジュール、ユーティリティ
【環境】    ─── 開発環境、外部ライブラリ対応
```

## 📋 各ファイルの役割詳細

### 🎯 **コア・基盤機能**

#### `index.ts` - エクスポート統合ハブ
- **役割**: 全型定義の統一エクスポート
- **機能**: 型定義の重複回避、インポート簡素化
- **編集タイミング**: 新しい型定義ファイル追加時、エクスポート設定変更

#### `global-types.ts` - グローバルインターフェース
- **役割**: システム全体で使用される基盤型定義
- **機能**: NicoCache_nl、Window拡張、Logger、削除動画プレーヤー
- **編集タイミング**: 新しいグローバル機能追加、システム基盤変更

#### `global.d.ts` - グローバル宣言ファイル
- **役割**: TypeScriptグローバル名前空間の宣言
- **機能**: Window拡張、外部ライブラリ型定義
- **編集タイミング**: 新しいグローバルオブジェクト追加、外部ライブラリ統合

#### `common-types.ts` - 共通API関連
- **役割**: ニコニコ動画API、共通データ構造
- **機能**: NicoApiData、CommentApiResponse、fetch関連
- **編集タイミング**: API仕様変更、共通データ構造変更

### 🔧 **機能別型定義**

#### `filter-types.ts` - フィルター機能 (最大サイズファイル)
- **役割**: CommentFilter2、NGワード、フィルタリング
- **機能**: ルール定義、設定、レガシー変換、JSON Lines形式
- **編集タイミング**: フィルター機能追加・修正、ルール形式変更

#### `comment-types.ts` - コメント関連
- **役割**: コメントデータ、レンダラー、APIレスポンス
- **機能**: CommentData、Thread、デバッグインターフェース
- **編集タイミング**: コメント機能変更、新しいコメント属性追加

#### `video-types.ts` - 動画関連
- **役割**: 動画情報、プレイヤー設定、キャッシュ
- **機能**: VideoInfo、ApiData、HLS.js対応
- **編集タイミング**: 動画機能追加、プレイヤー仕様変更

#### `video-player-bridge-types.ts` - 動画プレイヤー連携
- **役割**: video_playerライブラリとの橋渡し
- **機能**: Video Player接続、データ同期、イベント通知
- **編集タイミング**: video_player仕様変更、連携機能追加

#### `mylist-types.ts` - マイリスト機能
- **役割**: マイリスト管理、キーワード、エクスポート
- **機能**: MylistInfo、KeywordInfo、ManagerSettings
- **編集タイミング**: マイリスト機能拡張、データ構造変更

### 🎨 **UI・表示関連**

#### `ui-types.ts` - UI設定・コンポーネント
- **役割**: UI設定、トースト通知、フォーム要素
- **機能**: ToastMode、UISettingValue、ドラッグ機能
- **編集タイミング**: UI機能追加、新しい設定項目、フォーム変更

#### `icon-types.ts` - アイコン関連
- **役割**: マテリアルアイコン、スタイル設定
- **機能**: IconName、IconOptions、サイズ・色設定
- **編集タイミング**: 新しいアイコン追加、スタイル設定変更

#### `toastr-types.ts` - 通知システム
- **役割**: トースト通知の型定義
- **機能**: ToastrOptions、ToastrInstance、通知管理
- **編集タイミング**: 通知機能変更、新しい通知タイプ追加

### 🔗 **その他機能モジュール**

#### `thumbnails-filter-types.ts` - サムネイルフィルター
- **役割**: サムネイル非表示機能
- **機能**: キーワード、ページタイプ、セレクター設定
- **編集タイミング**: サムネイルフィルター機能追加・修正

#### `background-image-types.ts` - 背景画像
- **役割**: 背景画像設定機能
- **機能**: BackgroundImageItem、設定管理
- **編集タイミング**: 背景画像機能変更、設定項目追加

#### `mlink-video-controller-types.ts` - リンク動画コントローラー
- **役割**: Links Video Controller機能
- **機能**: 再生制御、コメント検索、アクション定義
- **編集タイミング**: 動画コントローラー機能追加・修正

### ⚙️ **システム・インフラ**

#### `database-types.ts` - データベース
- **役割**: IndexedDB、ストレージ管理
- **機能**: StoreConfig、ルールアイテム、設定アイテム
- **編集タイミング**: データベース構造変更、新しいストア追加

#### `module-types.ts` - モジュールシステム
- **役割**: モジュール管理、設定UI
- **機能**: ModuleConfig、PageType、依存関係管理
- **編集タイミング**: モジュールシステム拡張、新しいページタイプ追加

#### `util-types.ts` - ユーティリティ
- **役割**: 汎用ユーティリティ機能
- **機能**: キャッシュ管理、SI接頭辞、タイマー
- **編集タイミング**: 新しいユーティリティ機能追加

### 🛠️ **開発・環境設定**

#### `vite-env.d.ts` - Vite環境
- **役割**: Vite開発環境の型定義
- **機能**: CSS inline import対応
- **編集タイミング**: Vite設定変更、新しいファイル形式対応

#### `nico-common.d.ts` - NicoCommon宣言
- **役割**: NicoCommonライブラリの型宣言
- **機能**: Header関連機能
- **編集タイミング**: NicoCommon仕様変更対応

#### `performance.d.ts` - パフォーマンス拡張
- **役割**: Performance APIの拡張型定義
- **機能**: メモリ情報取得（Chrome専用）
- **編集タイミング**: パフォーマンス計測機能追加

## 🎯 目的別編集ガイド

### 💡 **新しい機能を追加したい**
1. **機能別ファイル** - 対応する機能の型定義ファイルに追加
2. **index.ts** - 新しい型をエクスポートに追加
3. **global-types.ts** - グローバルアクセスが必要な場合

### 🔧 **フィルター機能を拡張したい**
- **メイン対象**: `filter-types.ts`
- **関連**: `comment-types.ts`, `database-types.ts`
- **設定UI**: `ui-types.ts`

### 🎨 **UIコンポーネントを追加したい**
1. `ui-types.ts` - UI設定、フォーム要素
2. `icon-types.ts` - 新しいアイコン
3. `toastr-types.ts` - 通知が必要な場合

### 🎬 **動画関連機能を追加したい**
- **基本**: `video-types.ts`
- **プレイヤー連携**: `video-player-bridge-types.ts`
- **API関連**: `common-types.ts`

### 💾 **データ構造を変更したい**
1. **対象機能の型定義ファイル** - 基本構造変更
2. `database-types.ts` - 保存形式変更
3. `common-types.ts` - API関連変更

### 🌐 **グローバル機能を追加したい**
1. `global-types.ts` - インターフェース定義
2. `global.d.ts` - TypeScript宣言
3. `index.ts` - エクスポート設定

### 🔗 **外部ライブラリを統合したい**
1. **環境ファイル** - `vite-env.d.ts`, `performance.d.ts`等
2. `global.d.ts` - グローバル宣言
3. **専用ファイル** - 大きなライブラリは専用型定義ファイル作成

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **型追加時**: `index.ts` (エクスポート追加)
- **グローバル変更**: `global-types.ts`, `global.d.ts`
- **共通データ変更**: `common-types.ts`

### 🚨 **変更時の影響範囲**
- `index.ts` 変更 → 全プロジェクトのインポートに影響
- `global-types.ts` 変更 → システム全体に影響
- `filter-types.ts` 変更 → フィルター機能全体に影響
- `common-types.ts` 変更 → API関連機能全体に影響

### 📝 **型定義のベストプラクティス**
- **命名規則**: PascalCase for interfaces, camelCase for types
- **インポート**: `index.ts`経由での統一インポートを推奨
- **重複回避**: 似た型は共通化、明示的なエイリアス使用
- **後方互換性**: 既存の型を壊さない拡張を心掛ける

### 🔍 **型の関係性**
- **継承関係**: 基本型 → 拡張型の順序で定義
- **依存関係**: 循環参照を避ける設計
- **インポート順序**: 基盤型 → 機能型 → UI型の順序

### 🎛️ **ファイルサイズ管理**
- **大きなファイル**: `filter-types.ts`(7.4KB), `comment-types.ts`(6.9KB)
- **分割基準**: 1つのファイルが8KB超える場合は分割検討
- **関連性**: 機能的に関連する型は同じファイルに配置

## 🔧 デバッグ・テスト

### TypeScript型チェック
```typescript
// 型の確認
const example: CommentData = { /* ... */ };

// 型ガードの使用
if (isCommentData(data)) {
  // 安全な型として使用
}
```

### よく使用される型の確認
```typescript
// グローバル型
window.NicoCache_nl.watch.apiData

// フィルター型
const rule: NGWordRule = { /* ... */ };

// UI型
const settings: UIFilterSettings = { /* ... */ };
```

この文書を参考に、効率的にtypes型定義システムを編集・拡張できます！ 