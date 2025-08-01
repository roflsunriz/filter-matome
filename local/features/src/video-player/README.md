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
│   ├── cache-manager.ts                  # キャッシュ・メモリ管理 (12KB)
│   ├── comment-fetcher.ts                # コメントAPI取得 (5.5KB)
│   ├── comment-renderer.ts               # コメント描画エンジン (36KB)
│   ├── comment-system.ts                 # コメントシステム統合 (21KB)
│   ├── database-manager.ts               # 🆕 データベース統合管理システム (18KB)
│   ├── migration-manager.ts              # 🆕 マイグレーション管理システム (15KB)
│   └── url-manager.ts                    # URL・キャッシュ管理 (5KB)
├── ui/
│   ├── comment-list.ts                   # コメントリスト表示 (16KB)
│   ├── floating-player.ts                # フローティングプレーヤー (24KB)
│   ├── player-controls.ts                # プレーヤーコントロール (77KB)
│   └── templates.ts                      # HTMLテンプレート (推定20KB)
├── utils/
│   ├── dom-utils.ts                      # DOM操作ユーティリティ (5KB)
│   ├── indexed-db-utils.ts               # IndexedDB操作 (永続化昇格機能対応) (7KB)
│   └── toast.ts                          # トースト通知 (9KB)
└── integration-test.ts                   # 🆕 統合テスト・動作検証 (12KB)
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

### コメントサブシステム
```
comment-fetcher.ts ─── APIからコメント取得
    ↓
comment-system.ts ─── フィルタリング・統合処理
    ↓ ┌─── comment-renderer.ts ─── Canvas描画
    ↓ └─── comment-list.ts ─── リスト表示
    ↓
プレーヤー画面表示
```

### キャッシュ・メモリ管理
```
cache-manager.ts ─── メモリ監視・クリーンアップ
    ↓
HLS.js / ネイティブ再生 ─── 動画データ管理
    ↓
最適化された再生パフォーマンス
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
- **機能**: 設定・キャッシュ・履歴・統計管理、自動クリーンアップ、シングルトン設計
- **編集タイミング**: 新しいデータ種類追加、永続化戦略変更、統計機能拡張

#### 🆕 `core/migration-manager.ts` - マイグレーション管理 (重要)
- **役割**: データベース自動昇格・バージョン管理
- **機能**: 段階的マイグレーション、バックアップ作成、ロールバック、整合性チェック
- **編集タイミング**: 新バージョン追加、マイグレーション戦略変更、データ変換ロジック

#### `core/comment-system.ts` - コメントシステム統合
- **役割**: コメント機能の中央制御・統合管理
- **機能**: レンダラー・リスト・フェッチャーの統合、CommentFilter2連携、NGフィルター
- **編集タイミング**: コメント機能全体の修正、新しいフィルター追加、外部連携変更

#### `core/comment-renderer.ts` - コメント描画エンジン (最大級ファイル)
- **役割**: Canvas上へのコメント描画・アニメーション
- **機能**: リアルタイムコメント描画、衝突判定、レーン管理、仮想拡張キャンバス
- **編集タイミング**: 描画パフォーマンス改善、新しいコメント効果、レイアウト調整

### 🎨 **UI・インターフェース**

#### `ui/player-controls.ts` - プレーヤーコントロール (最大ファイル)
- **役割**: シャドウDOM版プレーヤーUI・設定画面
- **機能**: 再生制御、音量・進捗バー、フルスクリーン、コメント設定、キーボードショートカット
- **編集タイミング**: UI変更、新しい設定項目、操作性改善、ショートカット追加

#### `ui/comment-list.ts` - コメントリスト表示
- **役割**: シャドウDOM版コメントリスト・サイドパネル
- **機能**: コメント一覧表示、時間同期、自動スクロール、シーク機能
- **編集タイミング**: リスト表示の改善、新しい表示形式、レスポンシブ対応

#### `ui/floating-player.ts` - フローティングプレーヤー
- **役割**: 削除済み動画用独立プレーヤー
- **機能**: ドラッガブル半透明プレーヤー、HLS/MP4対応、リサイズ対応
- **編集タイミング**: 削除済み動画機能拡張、プレーヤーデザイン変更

#### `ui/templates.ts` - HTMLテンプレート
- **役割**: UIのHTML構造・スタイル定義
- **機能**: プレーヤーHTML、CSS定義
- **編集タイミング**: UI構造変更、新しいコンポーネント追加

### 💾 **データ・ネットワーク**

#### `core/url-manager.ts` - URL・キャッシュ管理
- **役割**: 動画URL生成・キャッシュ検索
- **機能**: キャッシュサーバー連携、URL存在確認、フォールバック処理
- **編集タイミング**: キャッシュ仕様変更、新しいURL形式対応

#### `core/comment-fetcher.ts` - コメントAPI取得
- **役割**: ニコニコ動画コメントAPI連携
- **機能**: API認証、コメントデータ取得、エラーハンドリング
- **編集タイミング**: API仕様変更対応、認証方式変更

#### `core/cache-manager.ts` - キャッシュ・メモリ管理
- **役割**: ブラウザメモリ最適化・キャッシュクリーンアップ
- **機能**: メモリ監視、HLS.js管理、自動クリーンアップ
- **編集タイミング**: メモリ効率改善、新しいクリーンアップ戦略

### ⚙️ **設定・ユーティリティ**

#### `config/constants.ts` - 設定・定数定義
- **役割**: システム全体の設定値・定数管理
- **機能**: URL設定、トースト設定、プレーヤー設定、キャッシュ設定
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

#### 🆕 `integration-test.ts` - 統合テスト・動作検証
- **役割**: システム全体の動作検証・品質保証
- **機能**: 基本機能テスト、後方互換性テスト、マイグレーションテスト、新機能テスト
- **編集タイミング**: 新機能追加時、バグ修正時、品質向上時

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
- **メイン対象**: `core/comment-renderer.ts`
- **補助対象**: `core/comment-system.ts`, `config/constants.ts`
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
- **キャッシュ連携**: `index.ts`, `ui/floating-player.ts`

### 🚀 **パフォーマンスを改善したい**
- **メモリ管理**: `core/cache-manager.ts`
- **描画最適化**: `core/comment-renderer.ts`
- **DOM操作**: `utils/dom-utils.ts`
- **UI応答**: `ui/player-controls.ts`

### 🎬 **削除済み動画機能を拡張したい**
- **メイン**: `ui/floating-player.ts`
- **統合**: `index.ts` (グローバルインターフェース)
- **UI**: `ui/templates.ts`

### 🆕 **永続化機能を拡張したい**
- **メイン**: `core/database-manager.ts`
- **設定**: `config/database-config.ts`
- **型定義**: `types/database-types.ts`
- **テスト**: `integration-test.ts`

### 🆕 **マイグレーション機能を変更したい**
- **メイン**: `core/migration-manager.ts`
- **設定**: `config/database-config.ts` (MIGRATION_CONFIGS)
- **テスト**: `integration-test.ts`
- **統合**: `core/database-manager.ts`

### 🆕 **新しいデータ種類を追加したい**
1. `config/database-config.ts` - ストア定義・データ型追加
2. `core/migration-manager.ts` - マイグレーション戦略
3. `core/database-manager.ts` - CRUD操作追加
4. `types/database-types.ts` - 型定義
5. `integration-test.ts` - テスト追加

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
- `core/comment-renderer.ts` 変更 → コメント描画全体に影響
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
- `CacheManager` - メモリ最適化
- `FloatingDeletedPlayer` - 削除済み動画プレーヤー
- **🆕 `DatabaseManager` - データベース統合管理**
- **🆕 `MigrationManager` - マイグレーション管理**
- **🆕 `DatabaseIntegrationTest` - 統合テスト**

この文書を参考に、効率的にvideo-playerプロジェクトを編集できるのじゃ！ 

## 🆕 永続化昇格機能 詳細ガイド

### 🎯 **機能概要**
永続化昇格機能は、video-playerプロジェクトに高度なデータ管理と分析機能を追加する画期的なシステムなのじゃ。

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
従来のAPIは完全に動作し、内部的に昇格機能を使用するのじゃ：
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

この永続化昇格機能により、video-playerは単なる動画プレーヤーから、高度な分析機能を持つ統合プラットフォームへと進化したのじゃ！