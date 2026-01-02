# Cache Data Manager プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
src/
├── main.ts                              # メインエントリーポイント
├── types/
│   └── index.ts                         # 型定義 (2.0KB)
├── managers/
│   ├── event-manager.ts                 # イベント管理 (436B)
│   ├── progress-manager.ts              # プログレス表示管理 (1.3KB)
│   ├── filter-manager.ts                # 画質・ステータスフィルター管理 [NEW]
│   └── sort-manager.ts                  # 複数ソートオプション管理 [NEW]
├── loaders/
│   └── load-data-from-memory.ts         # メモリデータローダー (2.5KB)
├── clients/
│   ├── api-client.ts                    # API通信クライアント (1.7KB)
│   └── lazy-api-client.ts               # 遅延API読み込み (348B)
├── engines/
│   └── search-engine.ts                 # 検索エンジン (1.8KB)
├── renderers/
│   └── virtual-scroll-renderer.ts       # 仮想スクロールレンダリング
├── components/
│   ├── filter-sort-ui.ts                # フィルター・ソートUIコンポーネント [NEW]
│   ├── search-results-modal.ts          # 検索結果モーダル [NEW]
│   └── lazy-image-loader.ts             # サムネイル遅延読み込み [NEW]
├── builders/
│   └── ui-builder.ts                    # UI構築 (4.1KB)
├── coordinators/
│   └── event-coordinator.ts             # イベント調整 (4.7KB)
├── templates/
│   ├── card-template.ts                 # 動画カードテンプレート (1.8KB)
│   └── header-template.ts               # ヘッダーテンプレート (671B)
└── styles/
    └── styles.ts                        # CSSスタイル定義 (17KB)

関連フォルダ:
├── config/
│   └── vite.config.ts                   # Viteビルド設定
└── dist/
    └── list.js                          # コンパイル済みファイル
```

## 🏗️ アーキテクチャ概要

### データフロー
```
グローバル変数 (tempList/cacheList)
    ↓
LoadDataFromMemory ─── メモリからデータ統合・正規化
    ↓
FilterManager ─── 画質・ステータスでフィルタリング [NEW]
    ↓
SortManager ─── ID順/タイトル順/画質順でソート [NEW]
    ↓
VirtualScrollRenderer ─── 可視範囲のみDOM生成 [NEW]
    ↓
LazyImageLoader ─── サムネイル遅延読み込み [NEW]
    ↓
DOM表示 (動画カード一覧)
```

### 検索フロー (モーダル表示)
```
検索クエリ入力
    ↓
SearchEngine ─── FlexSearchによる高速検索
    ↓
FilterManager/SortManager ─── 結果にフィルター・ソート適用
    ↓
SearchResultsModal ─── モーダルで結果表示 [NEW]
    ↓
ページネーション対応表示
```

### UI・イベントフロー
```
UIBuilder ─── ヘッダー・コンテナ構築
    ↓
FilterSortUI ─── フィルター・ソートUI [NEW]
    ↓
EventCoordinator ─── ユーザー操作処理
    ↓ (検索・再生・保存・削除)
EventManager ─── イベント通知・調整
    ↓
APIClient ─── 詳細情報取得 (遅延読み込み)
    ↓
モーダル表示 & アクション実行
```

### 初期化フロー
```
main.ts ─── システム初期化
    ↓
ProgressManager ─── 進行状況表示
    ↓
EventManager ─── イベント管理開始
    ↓
FilterManager/SortManager ─── フィルター・ソート初期化 [NEW]
    ↓
UIBuilder ─── UI構築・レンダリング開始
    ↓
VirtualScrollRenderer ─── 仮想スクロール初期化 [NEW]
    ↓
EventCoordinator ─── ユーザー操作待機
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `main.ts` - メインエントリーポイント
- **役割**: システム全体の初期化・統合
- **機能**: スタイル読み込み、各マネージャー初期化、DOM読み込み監視
- **編集タイミング**: システム全体の挙動変更、初期化順序変更

#### `loaders/load-data-from-memory.ts` - データローダー
- **役割**: グローバル変数からのデータ読み込み・統合
- **機能**: tempList/cacheListマージ、エントリ正規化、ソート処理
- **編集タイミング**: データ形式変更、ソートロジック変更、新しいメタデータ追加

#### `engines/search-engine.ts` - 検索エンジン
- **役割**: FlexSearchを使った高速検索
- **機能**: インデックス構築、検索クエリ処理、結果フィルタリング
- **編集タイミング**: 検索機能強化、新しい検索フィールド追加

### 🔍 **フィルター・ソート機能** [NEW]

#### `managers/filter-manager.ts` - フィルター管理
- **役割**: 画質・ステータスによるデータフィルタリング
- **機能**: 
  - 画質フィルター (HD/SD/Low/Unknown)
  - ステータスフィルター (Complete/Temporary)
  - フィルター変更イベント通知
- **編集タイミング**: 新しいフィルターオプション追加

#### `managers/sort-manager.ts` - ソート管理
- **役割**: 複数ソートオプションによるデータソート
- **機能**:
  - ID順 (nm → sm → so)
  - タイトル順 (あいうえお順)
  - 画質順 (高→低)
  - 昇順/降順切り替え
- **編集タイミング**: 新しいソートオプション追加

### 🎨 **UI・レンダリング**

#### `builders/ui-builder.ts` - UI構築 (中核ファイル)
- **役割**: UIの構築・テンプレート管理・初期レンダリング
- **機能**: ヘッダー構築、動画カード生成、フォント読み込み、品質バッジ
- **編集タイミング**: UI構造変更、新しいカード要素追加、テンプレート修正

#### `renderers/virtual-scroll-renderer.ts` - 仮想スクロール [NEW]
- **役割**: 大量データの高効率レンダリング
- **機能**:
  - Intersection Observerによる可視範囲検出
  - 可視範囲 + バッファ分のみDOM生成
  - スペーサー要素による全体高さ維持
  - 動的カラム数計算
- **編集タイミング**: パフォーマンス改善、バッファサイズ調整

#### `coordinators/event-coordinator.ts` - イベント調整
- **役割**: ユーザー操作の処理・調整
- **機能**: クリックイベント、キーボード入力、API詳細取得、モーダル表示、スクロールトップボタン
- **編集タイミング**: 新しいユーザー操作追加、イベント処理改善

### 🧩 **コンポーネント** [NEW]

#### `components/filter-sort-ui.ts` - フィルター・ソートUI
- **役割**: フィルター・ソート操作用UIコンポーネント
- **機能**:
  - 画質・ステータスフィルター選択UI
  - ソートオプション・方向選択UI
  - 結果件数表示
  - リセットボタン
- **編集タイミング**: UI改善、新しいフィルター追加

#### `components/search-results-modal.ts` - 検索結果モーダル
- **役割**: 検索結果をモーダル表示
- **機能**:
  - モーダルUI（オーバーレイ、閉じるボタン）
  - 検索結果グリッド表示
  - ページネーション（50件/ページ）
  - ESCキー/背景クリックで閉じる
- **編集タイミング**: モーダルデザイン変更、ページネーション調整

#### `components/lazy-image-loader.ts` - サムネイル遅延読み込み
- **役割**: サムネイル画像の遅延読み込み
- **機能**:
  - Intersection Observerによる遅延読み込み
  - プレースホルダー表示
  - エラー時のフォールバック画像
- **編集タイミング**: 読み込み戦略変更、プレースホルダー改善

### 🎨 **テンプレート・スタイル**

#### `templates/card-template.ts` - 動画カードテンプレート
- **役割**: 動画カードのHTML構造定義
- **機能**: サムネイル（遅延読み込み対応）、タイトル、メタデータ、アクションボタン
- **編集タイミング**: カードレイアウト変更、新しいボタン追加

#### `templates/header-template.ts` - ヘッダーテンプレート
- **役割**: ヘッダー部分のHTML構造定義
- **機能**: ナビゲーション、検索ボックス、サイトリンク
- **編集タイミング**: ヘッダー機能追加、ナビゲーション変更

#### `styles/styles.ts` - CSSスタイル (最大ファイル)
- **役割**: 全体のスタイル定義
- **機能**: 
  - グリッドレイアウト、アニメーション
  - 仮想スクロールコンテナスタイル
  - 検索結果モーダルスタイル
  - フィルター・ソートUIスタイル
  - レスポンシブ対応、テーマ
- **編集タイミング**: デザイン変更、新しいUIコンポーネント、アニメーション追加

### 💾 **データ・通信**

#### `clients/api-client.ts` - API通信クライアント
- **役割**: ニコニコ動画APIとの通信
- **機能**: API呼び出し、XMLレスポンス解析、キャッシュ管理
- **編集タイミング**: API仕様変更対応、新しいデータフィールド追加

#### `clients/lazy-api-client.ts` - 遅延API読み込み
- **役割**: APIクライアントの遅延初期化
- **機能**: 必要時のみAPIクライアント作成、メモリ効率化
- **編集タイミング**: リソース最適化、初期化タイミング調整

### 🛠️ **管理・ユーティリティ**

#### `managers/event-manager.ts` - イベント管理
- **役割**: アプリケーション内イベントの管理
- **機能**: イベントリスナー管理、イベント発火・通知
- **編集タイミング**: 新しいイベントタイプ追加、イベントフロー変更

#### `managers/progress-manager.ts` - プログレス管理
- **役割**: 処理進行状況の表示管理
- **機能**: プログレスバー表示、エラー表示、進行率更新
- **編集タイミング**: UI改善、新しい進行状況表示

#### `types/index.ts` - 型定義
- **役割**: TypeScript型定義の統合管理
- **機能**: VideoData、APIResponse、EventCallback等の型定義
- **編集タイミング**: 新しいデータ構造追加、型安全性向上

## 🎯 目的別編集ガイド

### 💡 **新しい動画メタデータを追加したい**
1. `types/index.ts` - VideoData型に新しいフィールド追加
2. `loaders/load-data-from-memory.ts` - データ正規化ロジック更新
3. `templates/card-template.ts` - 表示要素追加
4. `builders/ui-builder.ts` - カード生成ロジック更新
5. `styles/styles.ts` - 新要素のスタイル追加

### 🔍 **検索機能を強化したい**
- **メイン対象**: `engines/search-engine.ts`
- **補助対象**: `loaders/load-data-from-memory.ts` (検索対象フィールド追加)
- **UI調整**: `coordinators/event-coordinator.ts` (検索イベント処理)
- **モーダル調整**: `components/search-results-modal.ts` (表示カスタマイズ)

### 🎨 **UIデザインを変更したい**
1. `styles/styles.ts` - CSSスタイル変更・追加
2. `templates/card-template.ts` - HTML構造変更
3. `templates/header-template.ts` - ヘッダー構造変更
4. `builders/ui-builder.ts` - UI構築ロジック調整

### 🚀 **パフォーマンスを改善したい**
- **レンダリング**: `renderers/virtual-scroll-renderer.ts` (バッファサイズ、カード高さ調整)
- **画像読み込み**: `components/lazy-image-loader.ts` (rootMargin調整)
- **データ処理**: `loaders/load-data-from-memory.ts` (ソート・フィルタリング最適化)
- **検索**: `engines/search-engine.ts` (インデックス最適化)

### 🔧 **新しいフィルターオプションを追加したい**
1. `managers/filter-manager.ts` - 新しいフィルター型・ロジック追加
2. `components/filter-sort-ui.ts` - UIにオプション追加
3. `styles/styles.ts` - 必要に応じてスタイル追加

### 🔧 **新しいソートオプションを追加したい**
1. `managers/sort-manager.ts` - 新しいソート型・ロジック追加
2. `components/filter-sort-ui.ts` - UIにオプション追加

### 🔧 **新しいアクションボタンを追加したい**
1. `templates/card-template.ts` - ボタンHTML追加
2. `coordinators/event-coordinator.ts` - クリックイベント処理追加
3. `styles/styles.ts` - ボタンスタイル追加
4. `types/index.ts` - 必要に応じて新しいイベント型追加

### 🌐 **APIレスポンス形式が変更された場合**
1. `clients/api-client.ts` - 解析ロジック更新
2. `types/index.ts` - APIResponse型更新
3. `coordinators/event-coordinator.ts` - モーダル表示ロジック更新

### 📱 **レスポンシブ対応を改善したい**
- **メイン対象**: `styles/styles.ts` (メディアクエリ調整)
- **補助対象**: `templates/card-template.ts` (HTML構造調整)
- **仮想スクロール**: `renderers/virtual-scroll-renderer.ts` (カラム数計算調整)

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **型変更時**: `types/index.ts` (全ファイルに影響)
- **データ形式変更時**: `loaders/load-data-from-memory.ts` (データフロー全体に影響)
- **UI変更時**: `styles/styles.ts` (全体デザインに影響)

### 🚨 **変更時の影響範囲**
- `types/index.ts` 変更 → 全TypeScriptファイルに影響
- `loaders/load-data-from-memory.ts` 変更 → 検索・レンダリング全体に影響
- `builders/ui-builder.ts` 変更 → UI表示全体に影響
- `styles/styles.ts` 変更 → 全体のデザイン・レイアウトに影響
- `managers/filter-manager.ts` 変更 → フィルター関連全体に影響
- `managers/sort-manager.ts` 変更 → ソート関連全体に影響

### 📝 **コーディング規約**
- TypeScript strictモード対応必須
- 非同期処理は async/await を使用
- エラーハンドリングは try-catch で適切に処理
- 大量データ処理時はバッチ処理とrequestAnimationFrameを活用
- Intersection Observerを使用した遅延処理推奨

### 🎛️ **ビルド・開発環境**
- **開発サーバー**: `npm run dev` (Vite HMR対応)
- **本番ビルド**: `npm run build` → `dist/list.js`
- **個別ビルド**: `npm run build:cache-data-manager`
- **型チェック**: `npm run type-check`
- **設定ファイル**: `config/vite.config.ts`

## 🔍 デバッグ・テスト

### グローバル変数アクセス
```javascript
// データ確認
console.log(window.tempList);   // 一時キャッシュ
console.log(window.cacheList);  // 完全キャッシュ
console.log(window.ncversion);  // バージョン情報

// DOM要素確認
document.querySelector('.virtual-scroll-container');  // 仮想スクロールコンテナ
document.querySelector('.virtual-scroll-grid');       // グリッドコンテナ
document.querySelector('header');                     // ヘッダー要素
```

### よく使用するデバッグコマンド
```javascript
// 仮想スクロールの状態確認
document.querySelector('.virtual-scroll-grid').children.length;

// プログレスバーの状態
document.querySelector('.global-progress').style.display;

// FlexSearchライブラリの読み込み確認
typeof window.FlexSearch !== 'undefined';

// フィルター・ソート状態確認
document.querySelector('.filter-sort-container');
```

### 主要なDOM要素
- `.virtual-scroll-container` - 仮想スクロールコンテナ
- `.virtual-scroll-grid` - グリッドコンテナ
- `.video-card` - 個別動画カード
- `.global-progress` - プログレスバー
- `#searchInput` - 検索入力フィールド
- `.filter-sort-container` - フィルター・ソートUI
- `.search-results-modal` - 検索結果モーダル
- `.scroll-to-top-btn` - スクロールトップボタン

### パフォーマンス監視ポイント
- **初期レンダリング時間**: `renderAllEntries()` 実行時間
- **仮想スクロール効率**: 可視範囲のDOM要素数
- **検索応答時間**: 検索クエリからモーダル表示まで
- **サムネイル読み込み**: 遅延読み込みの動作確認
- **API呼び出し頻度**: キャッシュ効率性

## 🚀 開発Tips

### 効率的な開発フロー
1. **TypeScript型定義から開始** - `types/index.ts`で新機能の型を定義
2. **データフロー確認** - `loaders/load-data-from-memory.ts`でデータ処理確認
3. **フィルター・ソート拡張** - `managers/`で新しいオプション追加
4. **UI要素作成** - `templates/`でHTML、`styles/`でCSS追加
5. **コンポーネント実装** - `components/`で新しいUI部品作成
6. **イベント処理実装** - `coordinators/event-coordinator.ts`で操作処理
7. **統合テスト** - `main.ts`で全体動作確認

### よくある問題と解決法
- **レンダリングが重い** → `virtual-scroll-renderer.ts`のバッファサイズ調整
- **サムネイルが遅い** → `lazy-image-loader.ts`のrootMargin拡大
- **検索が遅い** → `search-engine.ts`のインデックス設定見直し
- **スタイルが崩れる** → `styles/styles.ts`のCSS競合確認
- **型エラー** → `types/index.ts`の型定義更新
- **フィルターが効かない** → `filter-manager.ts`のロジック確認

この文書を参考に、効率的にCache Data Managerプロジェクトを編集できます！
