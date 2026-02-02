# NicoCache_nl プロジェクト全体 アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
NicoCache_nl/
├── local/
│   └── features/                         # 🎯 **メインプロジェクト** (TypeScript化モダン機能群)
│       ├── src/                          # ソースコード
│       │   ├── comment-filter2/          # NGコメントフィルタリング (8.6KB README)
│       │   ├── video-player/             # 動画プレイヤー (11KB README)
│       │   ├── mylist2/                  # カスタムマイリスト管理 (14KB README)
│       │   ├── movie-info/               # 動画情報ダッシュボード
│       │   ├── mlink-video-controller/   # モジュール管理システム (18KB README)
│       │   ├── common/                   # 共通ライブラリ・ヘッダー (8.9KB README)
│       │   ├── types/                    # 型定義システム (12KB README)
│       │   └── docs/                     # ドキュメントページ (8.1KB README)
│       ├── config/                       # Vite設定ファイル群
│       ├── dist/                         # ビルド出力ファイル
│       ├── scripts/                      # スクリプト類
│       ├── package.json                  # 依存関係定義
│       └── tsconfig.json                 # TypeScript設定
├── *.js                                  # 🔧 **レガシーJavaScript** (元実装)
│   ├── list.js                           # メインキャッシュリスト (36KB) ✅編集可能
│   ├── nllib.js                          # ライブラリ (12KB) 🔒外部配布
│   ├── nllib_watch.js                    # 視聴ページ用 (13KB) 🔒外部配布
│   ├── 20_watchpage.js                   # 視聴ページ機能 (12KB) 🔒外部配布
│   ├── 15_cached_link_color.js           # リンク色変更 (7.7KB) 🔒外部配布
│   ├── url_injection_sys.js              # URL注入システム (7.3KB) 🔒外部配布
│   ├── popThumb.js                       # ポップアップサムネイル (6.3KB) 🔒外部配布
│   ├── nlThumbInfoRewriter.js            # サムネイル情報書き換え (5.8KB) 🔒外部配布
│   └── 05_cache_remove_button.js         # キャッシュ削除ボタン (1.4KB) 🔒外部配布
├── cache/                                # 📦 **キャッシュストレージ**
├── images/                               # 🖼️ **画像・アイコン**
├── background-images/                    # 🎨 **背景画像**
├── config/                               # ⚙️ **設定ファイル**
├── .vscode/                              # 🛠️ **開発環境設定**
└── nlFilters/                            # 📄 **フィルター・ドキュメント**
    ├── *.txt                             # フィルタールール
    ├── 199_readme.html                   # 使用方法説明
    └── 198_release_notes.*               # リリースノート
```

## 🏗️ アーキテクチャ概要

### プロジェクト構成レイヤー
```
【ユーザーインターフェース】
  ↓
comment-filter2 ─── NGコメント機能
video-player    ─── 動画再生機能
mylist2         ─── マイリスト機能
movie-info      ─── 統合情報ダッシュボード
  ↓
【システム統合層】
mlink-video-controller ─── モジュール管理・統合制御
  ↓
【基盤ライブラリ】
common          ─── 共通ライブラリ・ヘッダー
types           ─── 型定義システム
  ↓
【ドキュメント】
docs            ─── 使用方法・機能説明
  ↓
【レガシーシステム】
*.js files      ─── 従来の実装（段階的TypeScript移行中）
```

### データフロー
```
ニコニコ動画サイト
    ↓ (フック・傍受)
common/common.ts ─── API通信統一化
    ↓
各feature/*.ts ─── 個別機能処理
    ↓ ┌─── comment-filter2 ─── NGフィルタリング
    ↓ ├─── video-player ─── 動画再生制御
    ↓ ├─── mylist2 ─── マイリスト管理
    ↓ ├─── movie-info ─── 情報ダッシュボード
    ↓ └─── mlink-video-controller ─── 統合制御
    ↓
ユーザー体験向上
```

### ビルドシステム
```
src/*.ts ─── TypeScript開発
    ↓ (Vite)
config/*.config.js ─── 個別ビルド設定
    ↓
dist/*.es.js ─── 本番ファイル出力
    ↓
ニコニコ動画で使用
```

## 📋 各プロジェクトの役割詳細

### 🎯 **機能別プロジェクト**

#### `src/comment-filter2/` - NGコメントフィルタリング
- **役割**: コメントのフィルタリング・非表示機能
- **主要ファイル**: `filter/json-comment-filter.ts` (21KB), `components/ui-manager.ts` (53KB)
- **編集対象**: フィルター機能拡張、UI改善、新ルール形式追加
- **📚 詳細**: `src/comment-filter2/README.md`

#### `src/video-player/` - 動画プレイヤー
- **役割**: ニコニコ動画プレイヤーの機能拡張・制御
- **主要ファイル**: `index.ts` (29KB), `ui/player-controls.ts` (77KB), `core/comment-renderer.ts` (36KB)
- **編集対象**: プレイヤー機能追加、コメント描画改善、UI拡張
- **📚 詳細**: `src/video-player/README.md`

#### `src/mylist2/` - カスタムマイリスト管理
- **役割**: 独自マイリスト機能・動画管理
- **主要ファイル**: `ui/ui-refactored.ts` (1000行超), `components/manager-refactored.ts` (136行)
- **編集対象**: マイリスト機能拡張、UI改善、データ管理機能追加
- **📚 詳細**: `src/mylist2/README.md`

#### `src/movie-info/` - 動画情報ダッシュボード
- **役割**: キャッシュ情報・サムネイルAPI・MediaInfo・watch apiData を集約し俯瞰表示
- **主要ファイル**: `index.ts` (ダッシュボード制御), `api-clients.ts` (API取得), `ui.ts` (パネル管理)
- **編集対象**: 取得APIの拡張、UIサマリー、コメントプレビュー/ダウンロード制御
- **📚 詳細**: `src/movie-info/README.md`

#### `src/mlink-video-controller/` - モジュール管理システム
- **役割**: 機能モジュールの統合管理・設定UI
- **主要ファイル**: `panels/link-video.ts` (55KB), `module-handlers/settings-ui.ts` (39KB)
- **編集対象**: 新モジュール追加、統合制御機能拡張、設定UI改善
- **📚 詳細**: `src/mlink-video-controller/README.md`

### 🛠️ **基盤システム**

#### `src/common/` - 共通ライブラリ・ヘッダー
- **役割**: プロジェクト間で共有される機能
- **主要ファイル**: `header.ts` (19KB), `toastr.ts` (19KB), `common.ts` (5.0KB)
- **編集対象**: 共通機能追加、ヘッダー機能拡張、API通信統一化
- **📚 詳細**: `src/common/README.md`

#### `src/types/` - 型定義システム
- **役割**: TypeScript型定義の統合管理
- **主要ファイル**: `filter-types.ts` (7.4KB), `comment-types.ts` (6.9KB), `video-types.ts` (4.3KB)
- **編集対象**: 新機能の型定義追加、型安全性向上
- **📚 詳細**: `src/types/README.md`

#### `src/docs/` - ドキュメントページ
- **役割**: ユーザー向け機能説明・使用方法
- **主要ファイル**: `comment-filter2/index.html`, `mylist2/index.html`
- **編集対象**: ドキュメント更新、新機能説明追加
- **📚 詳細**: `src/docs/README.md`

### 🔧 **レガシーシステム**

#### ルートレベル `*.js` ファイル群
- **役割**: 従来のJavaScript実装
- **主要ファイル**: `list.js` (36KB), `nllib.js` (12KB), `20_watchpage.js` (12KB)
- **編集対象**: 
  - **`list.js`**: 編集可能（メインキャッシュリスト機能）
  - **その他`*.js`**: 外部配布のため基本的に編集しない
- **⚠️ 注意**: 
  - 新規開発は `src/` 以下のTypeScript版を使用
  - `list.js`以外を編集する場合はファイル名変更・nlFilters修正が必要

## 🎯 目的別編集ガイド

### 💡 **新しい機能を追加したい**

#### 🎬 **動画関連機能**
1. **プレイヤー機能**: `src/video-player/` - プレイヤー制御、コメント描画
2. **情報取得機能**: `src/movie-info/` - 動画関連APIダッシュボード
3. **統合制御**: `src/mlink-video-controller/` - モジュール化して統合

#### 🗂️ **マイリスト・フィルター機能**
1. **マイリスト**: `src/mylist2/` - カスタムマイリスト管理
2. **コメントフィルター**: `src/comment-filter2/` - NGコメント機能
3. **サムネイルフィルター**: `src/mlink-video-controller/modules/thumbnails-filter-module.ts`

#### 🎨 **UI・デザイン機能**
1. **共通ヘッダー**: `src/common/header.ts` - サイト全体のヘッダー
2. **通知システム**: `src/common/toastr.ts` - ユーザー通知
3. **背景・テーマ**: `src/mlink-video-controller/modules/background-*`

### 🐛 **既存機能を修正したい**

#### 📍 **問題の特定**
1. **コンソールエラー確認**: どのプロジェクトのエラーか特定
2. **該当README確認**: `src/プロジェクト名/README.md` で詳細確認
3. **ログ確認**: `window.logger.debug()` でデバッグ

#### 🔧 **修正手順**
1. **該当プロジェクト**: `src/プロジェクト名/` で修正
2. **型定義更新**: `src/types/` で必要に応じて型追加
3. **共通機能**: `src/common/` で共通部分修正
4. **レガシーシステム**: 
   - **`list.js`**: 直接編集可能
   - **その他`*.js`**: 外部配布のため編集不可（特別な理由がある場合のみファイル名変更して対応）
5. **ビルド**: `bun run build:ALL` で全体再ビルド

### 🎨 **UIデザインを変更したい**

#### 🎯 **対象別アプローチ**
1. **ヘッダー**: `src/common/header.ts` + `src/common/css-constants.ts`
2. **個別プロジェクト**: 各 `src/プロジェクト名/styles/` または `styles.ts`
3. **モジュール**: `src/mlink-video-controller/styles/`
4. **ドキュメント**: `src/docs/プロジェクト名/styles.ts`

### 🔄 **API・データ形式を変更したい**

#### 📡 **API関連**
1. **共通API**: `src/common/common.ts` - 基盤API機能
2. **個別API**: 各プロジェクトの適切なファイル
3. **型定義**: `src/types/common-types.ts`, `src/types/feature名-types.ts`

#### 💾 **データ形式**
1. **型定義更新**: `src/types/`
2. **データベース**: 各プロジェクトの `storage/` または `database.ts`
3. **マイグレーション**: データ移行処理の実装

### 🚀 **パフォーマンスを改善したい**

#### 🎯 **対象別最適化**
1. **コメント描画**: `src/video-player/core/comment-renderer.ts`
2. **フィルタリング**: `src/comment-filter2/filter/json-comment-filter.ts`
3. **UI応答**: 各プロジェクトのUI関連ファイル
4. **メモリ**: `src/video-player/core/cache-manager.ts`

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**

#### 🌐 **全体に影響するファイル**
- `src/common/` - 全プロジェクトで使用される基盤機能
- `src/types/` - TypeScript型定義（型安全性）
- `package.json` - 依存関係とビルドスクリプト
- `config/` - ビルド設定（Vite）

#### 📝 **編集前必読**
- **該当プロジェクトのREADME**: `src/プロジェクト名/README.md`
- **型定義**: `src/types/プロジェクト名-types.ts`
- **共通機能**: `src/common/README.md`

### 🚨 **変更時の影響範囲**

#### 💥 **高影響度ファイル**
- `src/common/index.ts` → 全プロジェクトの初期化
- `src/types/global-types.ts` → グローバル型定義
- `package.json` → 依存関係・ビルド
- 任意の `constants.ts` → プロジェクト全体の動作
- **`list.js`** → キャッシュリスト全体（編集可能）

#### ⚡ **中影響度ファイル**
- 各プロジェクトの `index.ts` → そのプロジェクト全体
- `src/common/header.ts` → ヘッダー表示
- `src/common/toastr.ts` → 通知システム

#### 🔒 **編集不可ファイル**
- **`list.js`以外の`*.js`**: 外部配布のため基本的に編集不可
- **nlFilters**: 外部jsファイル修正時のみ変更が必要

### 📝 **開発規約**

#### 🎯 **TypeScript開発**
- **新規開発**: 必ずTypeScript（`src/` 以下）で実装
- **型定義**: `src/types/` で適切に型定義
- **エラーハンドリング**: 必須実装
- **ログ出力**: `window.logger?.debug/info/warn/error` 使用

#### 🔄 **レガシー対応**
- **`list.js`**: 直接編集可能（メインキャッシュリスト機能の修正・拡張）
- **その他`*.js`ファイル**: 外部配布のため基本的に編集しない
  - 修正が必要な場合: ファイル名変更 + nlFilters修正が必要
  - 推奨: TypeScript版で代替機能を実装
- **新機能**: TypeScript版（`src/`）で実装を強く推奨

#### 🌐 **ブラウザ互換性**
- **Modern Browser**: ES6+ 対応ブラウザ
- **Shadow DOM**: Chrome/Firefox/Safari対応
- **TypeScript**: ES2020ターゲット

## 🔍 デバッグ・テスト

### 🛠️ **開発環境**

#### 🔧 **ローカル開発**
```bash
# 開発サーバー起動
bun dev

# 個別ビルド
bun run build:comment-filter2
bun run build:video-player
bun run build:mylist2

# 全体ビルド
bun run build:ALL
```
`bun run build:ALL` は `scripts/build-all.mjs` を経由し、個別ビルドスクリプトを `bun run` で順番に起動します。

#### 🧪 **デバッグアクセス**
```javascript
// プロジェクト固有
window.CommentFilter2Instance        // comment-filter2
window.VideoPlayerInstance          // video-player
window.MylistManagerInstance        // mylist2

// 共通機能
window.commonHelper                 // API通信
window.logger                       // ログ機能
window.toastr                       // 通知システム
window.NicoCommon                   // ヘッダー関連

// モジュール管理
window.linkVideoControllerInstance  // mlink-video-controller
```

### 📊 **パフォーマンス監視**
```javascript
// メモリ使用量
console.log(performance.memory)

// ログレベル調整
window.logger.setLevel(LogLevel.DEBUG)

// 各プロジェクトのデバッグ情報
window.プロジェクトInstance.getDebugInfo()
```

## 🚀 開発開始時のクイックガイド

### 🎯 **すぐに始めたい機能別**

#### 🎬 **動画・プレイヤー関連**
→ `src/video-player/README.md` から開始

#### 🗂️ **マイリスト・管理機能**
→ `src/mylist2/README.md` から開始

#### 🚫 **フィルター・NGワード**
→ `src/comment-filter2/README.md` から開始

#### 📊 **情報取得・表示**
→ `src/movie-info/README.md` から開始

#### 🔧 **システム統合・管理**
→ `src/mlink-video-controller/README.md` から開始

#### 🛠️ **基盤機能・共通ライブラリ**
→ `src/common/README.md` から開始

### 💡 **効率的な開発のコツ**
1. **該当プロジェクトのREADME熟読** - 詳細な編集ガイドあり
2. **型定義確認** - `src/types/README.md` で型システム理解
3. **共通機能活用** - `src/common/` で重複実装回避
4. **モジュール化検討** - `mlink-video-controller` で統合管理

この文書を参考に、効率的にNicoCache_nlプロジェクト全体を編集・拡張できます！ 
