# video-player プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/video-player/
├── index.ts                              # メインエントリーポイント (29KB)
├── config/
│   ├── constants.ts                      # 設定・定数定義 (4KB)
│   ├── database-config.ts                # 🆕 データベース設定・マイグレーション (8KB)
│   └── icons.ts                          # マテリアルアイコン定義 (700B)
├── core/
│   ├── comment-fetcher.ts                # コメントAPI取得 (5.5KB)
│   ├── comment-overlay-comment-system.ts # コメントオーバーレイ描画統合 (🆕)
│   ├── comment-system.ts                 # コメントシステム統合 (21KB)
│   ├── database-manager.ts               # 🆕 データベース統合管理システム (18KB)
│   ├── migration-manager.ts              # 🆕 マイグレーション管理システム (15KB)
│   └── url-manager.ts                    # URL・キャッシュ管理 (5KB)
├── ui/
│   ├── comment-list.ts                   # コメントリスト表示 (16KB)
│   ├── player-controls.ts                # プレーヤーコントロール (77KB)
│   └── templates.ts                      # HTMLテンプレート (推定20KB)
├── utils/
│   ├── dom-utils.ts                      # DOM操作ユーティリティ (5KB)
│   ├── indexed-db-utils.ts               # IndexedDB操作 (永続化昇格機能対応) (7KB)
│   └── toast.ts                          # トースト通知 (9KB)
```

## 🏗️ アーキテクチャ概要

### メインフロー
```
index.ts ─── システム全体の初期化・URL監視
    ↓
url-manager.ts ─── キャッシュ検索・URL生成
    ↓
NicoCachePlayer ─── カスタムプレーヤー作成
    ↓
player-controls.ts ─── UI・操作制御
    ↓
comment-system.ts ─── コメント統合管理
    ↓
コメント描画・再生制御
```

> MP4ソースは faststart 変換済みのため、追加のキャッシュクリーンアップ処理は不要です。

### コメントサブシステム
```
comment-fetcher.ts ─── APIからコメント取得
    ↓
comment-system.ts ─── フィルタリング・統合処理
    ↓ ┌─── comment-overlay-comment-system.ts ─── コメントオーバーレイ描画
    ↓ └─── comment-list.ts ─── リスト表示
    ↓
プレーヤー画面表示
```

### 🆕 永続化昇格サブシステム
```
database-manager.ts ─── データベース統合管理
    ↓ ┌─── migration-manager.ts ─── 自動マイグレーション
    ↓ │
    ↓ ├─── VideoCache ─── 動画キャッシュ情報
    ↓ │
    ↓ ├─── ViewHistory ─── 視聴履歴管理
    ↓ │
    ↓ ├─── UserStats ─── ユーザー統計
    ↓ │
    ↓ └─── CommentHistory ─── コメント履歴
    ↓
高度な永続化・分析機能
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - メインエントリーポイント (最も重要)
- **役割**: システム全体の初期化・統合・URL監視
- **機能**: NicoCachePlayerクラス、HLS.js読み込み、履歴API監視、削除済み動画対応
- **編集タイミング**: システム全体の挙動変更、新機能の統合、初期化ロジック変更

#### 🆕 `core/database-manager.ts` - データベース統合管理 (最重要)
- **役割**: 永続化昇格機能の中核・複数ストアの統合管理
- **機能**: 設定・キャッシュ・履歴・統計管理、自動クリーンアップ、破損DB再作成、シングルトン設計
- **編集タイミング**: 新しいデータ種類追加、永続化戦略変更、統計機能拡張
- **注意**: `onupgradeneeded` 内のスキーマ更新はバージョン変更トランザクション内で同期的に完了させること。`await` や別トランザクションを挟むと Firefox/Chrome でストア作成後の保存が失敗する可能性があります。初期化後はスキーマ検証を行い、作成失敗の残骸がある場合は一度だけ削除・再作成します。

#### 🆕 `core/migration-manager.ts` - マイグレーション管理 (重要)
- **役割**: データベース自動昇格・バージョン管理
- **機能**: 段階的マイグレーション、バックアップ作成、ロールバック、整合性チェック
- **編集タイミング**: 新バージョン追加、マイグレーション戦略変更、データ変換ロジック

#### `core/comment-system.ts` - コメントシステム統合
- **役割**: コメント機能の中央制御・統合管理
- **機能**: レンダラー・リスト・フェッチャーの統合、CommentFilter2連携、NGフィルター
- **編集タイミング**: コメント機能全体の修正、新しいフィルター追加、外部連携変更

#### 🆕 `core/comment-overlay-comment-system.ts` - コメントオーバーレイ描画統合
- **役割**: `comment-overlay` ライブラリを用いたコメント描画・表示制御
- **機能**: コメント整形、コマンド適用、v4.0.0向けコメントメタ情報連携、DOMレイヤ制御、表示/非表示切替
- **編集タイミング**: 描画パフォーマンス調整、コメント設定変更、外部レンダラー連携拡張

### 🎨 **UI・インターフェース**

#### `ui/player-controls.ts` - プレーヤーコントロール (最大ファイル)
- **役割**: シャドウDOM版プレーヤーUI・設定画面
- **機能**: 再生制御、音量・進捗バー、フルスクリーン、コメント設定、キーボードショートカット
- **編集タイミング**: UI変更、新しい設定項目、操作性改善、ショートカット追加
- **注意**: 設定メニューの外クリック判定は closed Shadow DOM を考慮して `composedPath()` で行うこと。コメント設定 UI は一時設定を表示し、適用時に CommentSystem 側で再フィルタ・再描画します。

#### `ui/comment-list.ts` - コメントリスト表示
- **役割**: シャドウDOM版コメントリスト・サイドパネル
- **機能**: コメント一覧表示、時間同期、自動スクロール、シーク機能
- **編集タイミング**: リスト表示の改善、新しい表示形式、レスポンシブ対応

#### `ui/templates.ts` - HTMLテンプレート
- **役割**: UIのHTML構造・スタイル定義
- **機能**: プレーヤーHTML、CSS定義
- **編集タイミング**: UI構造変更、新しいコンポーネント追加

### 💾 **データ・ネットワーク**

#### `core/url-manager.ts` - URL・キャッシュ管理
- **役割**: 動画URL生成・キャッシュ検索
- **機能**: キャッシュサーバー連携、URL存在確認、優先度付き並列プローブ、フォールバック処理
- **編集タイミング**: キャッシュ仕様変更、新しいURL形式対応

#### `standalone/player.ts` - スタンドアロン再生制御
- **役割**: スタンドアロンページのプレーヤー初期化・ソース選択・再生開始
- **機能**: 隠し video/HLS による候補URLの並列実再生プローブ、再生準備確認、候補失敗時のフォールバック、コメント読み込みの非同期補助化
- **補足**: コメントサーバが利用不可・低速でも、コメント読み込み失敗は再生失敗として扱わず動画再生を継続します。すべての再生プローブが失敗した場合は、キャッシュデータが存在しないことをモーダルダイアログで通知します。
- **編集タイミング**: 再生開始速度改善、フォールバック戦略変更、HLS/MP4再生処理変更

#### `core/comment-fetcher.ts` - コメントAPI取得
- **役割**: ニコニコ動画コメントAPI連携
- **機能**: API認証、全フォーク統合コメントデータ取得、エラーハンドリング
- **編集タイミング**: API仕様変更対応、認証方式変更

### ⚙️ **設定・ユーティリティ**

#### `config/constants.ts` - 設定・定数定義
- **役割**: システム全体の設定値・定数管理
- **機能**: URL設定、トースト設定、プレーヤー設定
- **編集タイミング**: 新しい設定項目追加、デフォルト値変更

#### 🆕 `config/database-config.ts` - データベース設定・マイグレーション
- **役割**: データベーススキーマ・マイグレーション戦略の定義
- **機能**: ストア設定、バージョン履歴、マイグレーション設定、データ型定義
- **編集タイミング**: 新しいストア追加、マイグレーション戦略変更、データ構造変更

#### `config/icons.ts` - アイコン定義
- **役割**: マテリアルアイコンの統一管理
- **機能**: プレーヤーアイコン定義
- **編集タイミング**: 新しいアイコン追加、アイコンデザイン変更

#### `utils/dom-utils.ts` - DOM操作ユーティリティ
- **役割**: DOM操作・要素待機の共通関数
- **機能**: 要素待機、プレーヤー検出、スタイル適用
- **編集タイミング**: 新しいDOM操作追加、要素検出改善

#### `utils/indexed-db-utils.ts` - データ保存 (永続化昇格機能対応)
- **役割**: ローカルデータ保存・設定永続化・後方互換性維持
- **機能**: 昇格機能統合、フォールバック機能、新旧API橋渡し
- **編集タイミング**: 昇格機能統合、互換性問題解決、新API追加

#### `utils/toast.ts` - トースト通知
- **役割**: ユーザー通知・フィードバック表示
- **機能**: 情報・成功・警告・エラー通知
- **編集タイミング**: 通知デザイン変更、新しい通知タイプ

## 🎯 目的別編集ガイド

### 💡 **新しいプレーヤー機能を追加したい**
1. `config/constants.ts` - 必要な設定定数を追加
2. `ui/player-controls.ts` - UI制御ロジック実装
3. `ui/templates.ts` - HTML要素・スタイル追加
4. `index.ts` - 機能統合・初期化処理

### 🎨 **コメント描画を改善したい**
- **メイン対象**: `core/comment-overlay-comment-system.ts`
- **補助対象**: `core/comment-system.ts`, `ui/comment-list.ts`, `config/constants.ts`
- **設定UI**: `ui/player-controls.ts`

### 🔧 **プレーヤーUIをカスタマイズしたい**
1. `ui/templates.ts` - HTML構造・CSS変更
2. `ui/player-controls.ts` - イベントハンドラー・動作変更
3. `config/icons.ts` - アイコン変更
4. `config/constants.ts` - UI設定調整

### 💾 **新しい設定項目を追加したい**
1. `config/constants.ts` - 設定定数定義
2. `utils/indexed-db-utils.ts` - 保存・読み込み処理
3. `ui/player-controls.ts` - 設定UI・制御ロジック
4. `ui/templates.ts` - 設定フォーム要素

### 🌐 **API・ネットワーク機能を変更したい**
- **URL管理**: `core/url-manager.ts`
- **コメント取得**: `core/comment-fetcher.ts`
- **キャッシュ連携**: `index.ts`, `standalone/player.ts`

### 🚀 **パフォーマンスを改善したい**
- **再生シーケンス**: `standalone/player.ts`
- **描画最適化**: `core/comment-overlay-comment-system.ts`
- **DOM操作**: `utils/dom-utils.ts`
- **UI応答**: `ui/player-controls.ts`

### 🎬 **削除済み動画機能を拡張したい**
- **検出・起動**: `router/watch-page-router.ts`
- **メイン**: `standalone/player.ts`
- **統合**: `index.ts` (グローバルインターフェース)
- **UI**: `standalone/main.ts`（deletedモード）, `ui/templates.ts`

### 🆕 **永続化機能を拡張したい**
- **メイン**: `core/database-manager.ts`
- **設定**: `config/database-config.ts`
- **型定義**: `src/types/database-types.ts`, `src/types/video-types.ts`
- **テスト**: 追加する場合は `local/features/tests/` 配下に配置

### 🆕 **マイグレーション機能を変更したい**
- **メイン**: `core/migration-manager.ts`
- **設定**: `config/database-config.ts` (MIGRATION_CONFIGS)
- **テスト**: 追加する場合は `local/features/tests/` 配下に配置
- **統合**: `core/database-manager.ts`

### 🆕 **新しいデータ種類を追加したい**
1. `config/database-config.ts` - ストア定義・データ型追加
2. `core/migration-manager.ts` - マイグレーション戦略
3. `core/database-manager.ts` - CRUD操作追加
4. `src/types/database-types.ts` / `src/types/video-types.ts` - 型定義
5. `local/features/tests/` - テスト追加

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **設定変更時**: `config/constants.ts` (全体に影響)
- **UI変更時**: `ui/templates.ts` (HTML構造), `ui/player-controls.ts` (制御)
- **コメント機能変更時**: `core/comment-system.ts` (統合処理)
- **新機能追加時**: `index.ts` (システム統合)
- **🆕 データ変更時**: `config/database-config.ts` (永続化全体に影響)
- **🆕 永続化変更時**: `core/database-manager.ts` (データアクセス全体に影響)

### 🚨 **変更時の影響範囲**
- `config/constants.ts` 変更 → 全ファイルに影響
- `core/comment-overlay-comment-system.ts` 変更 → コメント描画全体に影響
- `ui/player-controls.ts` 変更 → プレーヤーUI全体に影響
- `index.ts` 変更 → システム全体の初期化に影響
- **🆕 `config/database-config.ts` 変更 → 永続化全体に影響**
- **🆕 `core/database-manager.ts` 変更 → データアクセス全体に影響**
- **🆕 `core/migration-manager.ts` 変更 → マイグレーション全体に影響**

### 📝 **コーディング規約**
- デバッグログは`window.logger?.debug/info/warn/error`を使用
- シャドウDOM使用でスタイル分離を徹底
- Web Components として `customElements.define()` で登録
- エラーハンドリングは必須（特にAPI・DOM操作）
- HLS.js とネイティブ再生の両対応を考慮

### 🎯 **アーキテクチャ特徴**
- **シャドウDOM**: スタイル分離、カプセル化
- **Web Components**: 再利用可能なUI要素
- **HLS.js**: HLS動画再生サポート
- **Canvas描画**: 高性能コメントレンダリング
- **IndexedDB**: 設定永続化
- **CommentFilter2連携**: 外部フィルター連携
- **🆕 永続化昇格機能**: 高度なデータ管理・統計機能
- **🆕 自動マイグレーション**: 無停止データベース昇格
- **🆕 シングルトン設計**: 統合されたデータアクセス
- **🆕 後方互換性**: 既存APIの完全対応

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// 削除済み動画プレーヤーのテスト
window.NicoCache_nl.deletedVideoPlayer.play("sm12345678", "テスト動画");
window.NicoCache_nl.deletedVideoPlayer.help();

// プレーヤー要素の取得
const videoElement = document.getElementById("video-element");
const playerControls = document.querySelector("player-controls-shadow");
const commentList = document.querySelector("comment-list-shadow");

// コメントシステムの状態確認
// (CommentSystemインスタンスはindex.ts内でプライベート)

// 🆕 永続化昇格機能のテスト
await window.NicoCache_nl.databaseTest.runAllTests();
await window.NicoCache_nl.databaseTest.displayAllSettings();
await window.NicoCache_nl.databaseTest.displayDatabaseStats();
```

### 主要なカスタムエレメント
- `player-controls-shadow` - プレーヤーコントロール
- `comment-list-shadow` - コメントリスト

### 重要なクラス
- `NicoCachePlayer` - メインプレーヤー統制
- `CommentRenderer` - コメント描画エンジン
- `CommentSystem` - コメント統合管理
- `UrlManager` - 動画ソース解決
- `StandalonePlayer` - スタンドアロンプレーヤー本体（削除動画再生にも利用）
- **🆕 `DatabaseManager` - データベース統合管理**
- **🆕 `MigrationManager` - マイグレーション管理**
- **🆕 `DatabaseIntegrationTest` - 統合テスト**

この文書を参考に、効率的にvideo-playerプロジェクトを編集できます！ 

## 🆕 永続化昇格機能 詳細ガイド

### 🎯 **機能概要**
永続化昇格機能は、video-playerプロジェクトに高度なデータ管理と分析機能を追加する画期的なシステムです。

### 📊 **管理されるデータ**
- **プレーヤー設定**: 従来の設定に加えカテゴリ管理
- **動画キャッシュ**: URL、品質、サイズ、有効期限
- **視聴履歴**: 動画情報、視聴時間、進捗、完了状態
- **ユーザー統計**: 日次・週次・月次の視聴統計
- **コメント履歴**: コメント活動の詳細記録
- **システム情報**: バージョン管理、メタデータ

### 🔧 **主要機能**

#### **自動マイグレーション**
```javascript
// 自動で実行される（手動実行も可能）
const migrationManager = new MigrationManager();
const result = await migrationManager.executeMigration(db, oldVersion, newVersion);
```

#### **データベース統合管理**
```javascript
// シングルトンパターン
const dbManager = DatabaseManager.getInstance();
await dbManager.initialize();

// 設定管理
await dbManager.savePlayerSetting('quality', '1080p', 'player');
const quality = await dbManager.getPlayerSetting('quality', '720p');

// 視聴履歴管理
await dbManager.addViewHistory({
  videoId: 'sm12345678',
  title: '面白い動画',
  watchedAt: new Date(),
  duration: 600,
  position: 300,
  completed: false,
  source: 'cache'
});
```

#### **統計機能**
```javascript
// 日次統計の保存
await dbManager.saveUserStats({
  statId: 'daily_2024-01-01',
  category: 'daily',
  date: '2024-01-01',
  data: {
    videosWatched: 10,
    totalDuration: 3600,
    commentsViewed: 500,
    cacheHits: 8,
    averageQuality: '720p'
  }
});

// 統計データの取得
const stats = await dbManager.getUserStats('daily', '2024-01-01');
```

### 🧪 **テスト・デバッグ**
```javascript
// 統合テスト実行
await window.NicoCache_nl.databaseTest.runAllTests();

// データベース統計表示
await window.NicoCache_nl.databaseTest.displayDatabaseStats();

// 全設定表示
await window.NicoCache_nl.databaseTest.displayAllSettings();

// デバッグ情報
const debugInfo = await dbManager.getDebugInfo();
console.log(debugInfo);
```

### 🔄 **後方互換性**
従来のAPIは完全に動作し、内部的に昇格機能を使用します：
```javascript
// 従来のAPI（内部的に昇格機能を使用）
await saveSettings('setting_key', 'value');
const value = await getSettings('setting_key', 'default');
const all = await getAllSettings();
```

### 🧹 **自動クリーンアップ**
- **24時間間隔**: 自動的に古いデータを削除
- **視聴履歴**: 90日間保持
- **コメント履歴**: 30日間保持
- **キャッシュデータ**: 7日間保持
- **統計データ**: 12ヶ月間保持

### 💾 **バックアップ・復旧**
```javascript
// 手動バックアップ作成
const backup = await dbManager.createBackup();

// データベースリセット
await dbManager.reset();

// 統計情報取得
const stats = await dbManager.getDatabaseStats();
```

### ⚡ **パフォーマンス最適化**
- **シングルトンパターン**: 単一インスタンスでリソース効率化
- **インデックス最適化**: 高速データ検索
- **バッチ処理**: 効率的なデータ処理
- **メモリ管理**: 自動的なメモリクリーンアップ

この永続化昇格機能により、video-playerは単なる動画プレーヤーから、高度な分析機能を持つ統合プラットフォームへと進化しました！
## 🚀 新しいルーティング方式

- 公式の視聴ページでは  が有料動画を判定し、スタンドアロンページ  へ遷移します。
- スタンドアロンページは  配下で構成され、 が  を初期化して動画・コメント・メタ情報を描画します。
- ルーティングロジックは  に切り出されており、無料動画は公式プレイヤーをそのまま利用します。
- レイアウトやスタイルを変更する場合は  と  を編集してください。


## 🚀 新しいルーティング方式

- 公式の視聴ページでは  が有料動画を判定し、スタンドアロンページ  へ遷移します。
- スタンドアロンページは  配下で構成され、 が  を初期化して動画・コメント・メタ情報を描画します。
- ルーティングロジックは  に切り出されており、無料動画は公式プレイヤーをそのまま利用します。
- レイアウトやスタイルを変更する場合は  と  を編集してください。


## 🚀 新しいルーティング方式
- 公式の視聴ページでは  が有料動画を判定し、スタンドアロンページ  へ遷移します。
- 公式の視聴ページでは  が有料動画を判定し、スタンドアロンページ  へ遷移します。
- 公式の視聴ページでは video-player.es.js が有料動画を判定し、スタンドアロンページ /local/features/dist/src/video-player/standalone/index.html へ遷移します。
- スタンドアロンページは src/video-player/standalone 配下で構成され、standalone/main.ts が StandalonePlayer を初期化して動画・コメント・メタ情報を描画します。
- メタ情報を取得できない動画では、タイトルを動画IDへフォールバックしてローカルキャッシュ再生を試行します。
- ルーティングロジックは src/video-player/router/watch-page-router.ts に切り出されており、無料動画は公式プレイヤーをそのまま利用します。削除・視聴不可動画を検出した場合は既存の deletedVideoPlayer インターフェース経由でスタンドアロン deleted モードを開きます。
- レイアウトやスタイルを変更する場合は standalone/layout.ts と standalone/styles.ts を編集してください。
- プレーヤー表示枠は動画メタデータの videoWidth/videoHeight から実動画比率へ更新し、全画面表示では画面内に収まる動画矩形を中央配置します。
