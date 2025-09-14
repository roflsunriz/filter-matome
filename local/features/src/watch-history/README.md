# watch-history プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/watch-history/
├── app.ts                                # メインSPAアプリケーション (108KB)
├── watch-tracker.ts                      # 視聴追跡・メタデータ収集 (29KB)
├── database.ts                           # IndexedDB操作・統計計算 (32KB)
├── migration-manager.ts                  # データベースマイグレーション (17KB)
├── styles.ts                             # 動的CSS・マテリアルデザイン (37KB)
├── index.html                            # SPAページ・UI構造定義 (36KB)
└── requirements.md                       # 仕様定義書・実装指針 (9KB)
```

## 🏗️ アーキテクチャ概要

### メインフロー（視聴履歴システム）
```
watch-tracker.ts ─── 視聴ページで動作・メタデータ収集
    ↓
commonHelper.fetchWatchPage ─── API連携・動画情報取得
    ↓
database.ts ─── IndexedDB保存・統計生成
    ↓
app.ts ─── SPA表示・検索・ソート・分析
    ↓
styles.ts ─── 美しいUI描画・レスポンシブ対応
```

### データ永続化サブシステム
```
IndexedDB ─── ローカル完結・無制限保存
    ↓ ┌─── WatchHistory ─── 視聴履歴・メタデータ
    ↓ │
    ↓ ├─── SeriesAlerts ─── シリーズ追跡・通知
    ↓ │
    ↓ └─── 統計生成 ─── 日次・週次・月次分析
    ↓
高度な履歴管理・分析機能
```

### マイグレーション・バージョン管理
```
migration-manager.ts ─── 自動データベース昇格
    ↓ ┌─── V1→V2 ─── シリーズ情報追加
    ↓ │
    ↓ ├─── バックアップ ─── 安全な移行処理
    ↓ │
    ↓ └─── 整合性チェック ─── データ検証・復旧
    ↓
無停止アップグレード・後方互換性
```

### 視聴追跡・分析フロー
```
視聴ページロード ─── メタデータ抽出
    ↓
再生イベント監視 ─── 進捗・完走・繰り返し検出
    ↓
リアルタイム記録 ─── 15秒間隔・デバウンス処理
    ↓
統計生成・シリーズ検出 ─── 自動分類・アラート
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `app.ts` - メインSPAアプリケーション (最重要)
- **役割**: 視聴履歴ビューSPAのメイン統制・UI管理
- **機能**: 検索・ソート・フィルタリング、統計表示、シリーズ管理、インポート・エクスポート
- **編集タイミング**: UI機能追加、新しい分析機能、表示ロジック変更、ユーザー操作追加

#### `watch-tracker.ts` - 視聴追跡・メタデータ収集
- **役割**: 視聴ページでの動画情報収集・視聴状況監視
- **機能**: 動画ID抽出、commonHelper連携、進捗記録、完走判定、繰り返し検出
- **編集タイミング**: 視聴追跡精度向上、新メタデータ対応、イベント監視追加、API仕様変更

#### `database.ts` - IndexedDB操作・統計計算
- **役割**: ローカルデータ永続化・高度な検索・統計生成
- **機能**: CRUD操作、インデックス活用、統計計算、バックアップ・復旧、クエリ最適化
- **編集タイミング**: 新データ種類追加、検索機能拡張、統計ロジック変更、パフォーマンス改善

#### `migration-manager.ts` - データベースマイグレーション
- **役割**: バージョン管理・自動データ移行・整合性保証
- **機能**: スキーマ更新、段階的移行、バックアップ作成、ロールバック、永続化管理
- **編集タイミング**: 新バージョン追加、マイグレーション戦略変更、データ構造変更

### 🎨 **UI・プレゼンテーション**

#### `styles.ts` - 動的CSS・マテリアルデザイン (巨大ファイル)
- **役割**: SPAの美しいUI・動的スタイル適用・レスポンシブ対応
- **機能**: マテリアルアイコン統合、グラデーション、モーダル、アニメーション、メディアクエリ
- **編集タイミング**: デザイン変更、新UI要素追加、レスポンシブ改善、アクセシビリティ向上

#### `index.html` - SPAページ・UI構造定義
- **役割**: アプリケーションの骨格・HTML構造・要素配置
- **機能**: タブナビゲーション、検索UI、統計表示、モーダル構造、アクション配置
- **編集タイミング**: UI構造変更、新しい画面追加、レイアウト変更、要素追加

### 📚 **ドキュメンテーション**

#### `requirements.md` - 仕様定義書・実装指針
- **役割**: プロジェクト仕様・技術選定・データフロー設計書
- **機能**: 技術スタック定義、データベーススキーマ、UI要件、実装方針
- **編集タイミング**: 仕様変更、新機能要件追加、技術方針変更、アーキテクチャ見直し

## 🎯 目的別編集ガイド

### 💾 **新しい履歴データ項目を追加したい**
1. `database.ts` - スキーマ定義・インデックス・CRUD操作追加
2. `migration-manager.ts` - 新バージョン・マイグレーション戦略定義
3. `watch-tracker.ts` - メタデータ収集ロジック拡張
4. `app.ts` - UI表示・フィルタリング機能追加

### 🎨 **UIデザインを改善したい**
- **メイン対象**: `styles.ts` (スタイル定義)
- **補助対象**: `index.html` (構造変更), `app.ts` (UI制御)
- **アイコン**: `../common/material-icons.ts` (アイコン追加)

### 📊 **新しい統計機能を追加したい**
1. `database.ts` - 統計計算ロジック・インデックス最適化
2. `app.ts` - 統計表示UI・グラフ生成
3. `styles.ts` - 統計画面スタイル・チャート対応
4. `index.html` - 統計要素・レイアウト追加

### 🔍 **検索・フィルタ機能を拡張したい**
- **メイン**: `app.ts` (検索ロジック・フィルター処理)
- **データベース**: `database.ts` (インデックス活用・クエリ最適化)
- **UI**: `index.html` (検索フォーム), `styles.ts` (UI改善)

### 🏷️ **シリーズ機能を拡張したい**
1. `app.ts` - シリーズUI・アラート管理・通知機能
2. `database.ts` - シリーズデータ構造・検索機能
3. `watch-tracker.ts` - シリーズ自動検出・分類ロジック
4. `migration-manager.ts` - シリーズ関連マイグレーション

### 📈 **視聴追跡精度を向上させたい**
- **メイン**: `watch-tracker.ts`
- **設定調整**: 進捗間隔・完走閾値・繰り返し検出
- **イベント監視**: 新しい視聴パターン対応
- **API連携**: commonHelper機能拡張

### 🔄 **データ移行・バックアップ機能を変更したい**
- **メイン**: `migration-manager.ts`
- **バックアップ**: 自動作成・手動実行・復旧処理
- **移行戦略**: 段階的処理・整合性チェック・ロールバック
- **統合**: `database.ts` (移行後処理), `app.ts` (UI連携)

### 📤 **インポート・エクスポート機能を拡張したい**
- **メイン**: `app.ts` (ファイル処理・変換ロジック)
- **フォーマット**: JSON・CSV・カスタム形式対応
- **UI**: `index.html` (ファイル選択), `styles.ts` (進捗表示)
- **データベース**: `database.ts` (一括処理・検証)

### ⚡ **パフォーマンスを最適化したい**
- **データベース**: `database.ts` (インデックス最適化・バッチ処理)
- **UI描画**: `app.ts` (仮想スクロール・遅延読み込み)
- **スタイル**: `styles.ts` (CSS最適化・アニメーション軽量化)
- **追跡**: `watch-tracker.ts` (デバウンス・メモリ効率)

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **データ構造変更時**: `database.ts`, `migration-manager.ts` (全体に影響)
- **UI変更時**: `styles.ts` (デザイン全体), `index.html` (構造), `app.ts` (制御)
- **追跡機能変更時**: `watch-tracker.ts` (メタデータ収集全体に影響)
- **新機能追加時**: `requirements.md` (仕様整理), `app.ts` (機能統合)

### 🚨 **変更時の影響範囲**
- `database.ts` 変更 → データアクセス全体・統計機能に影響
- `migration-manager.ts` 変更 → データ移行・バージョン管理に影響
- `app.ts` 変更 → UI表示・ユーザー操作全体に影響
- `styles.ts` 変更 → 全画面デザイン・レスポンシブ対応に影響
- `watch-tracker.ts` 変更 → 視聴データ収集全体に影響
- `index.html` 変更 → アプリ構造・要素配置全体に影響

### 📝 **コーディング規約**
- デバッグログは`logger.debug/info/warn/error`を使用（共通ロガー）
- IndexedDBの非同期処理は必ずPromise・async/awaitで管理
- UI更新は状態管理パターンに従い、直接DOM操作を最小限に
- エラーハンドリングは必須（特にデータベース・API操作）
- TypeScript型定義を活用し、型安全性を保持

### 🎯 **アーキテクチャ特徴**
- **SPA設計**: 単一ページアプリケーション・動的コンテンツ更新
- **IndexedDB**: ローカル完結・大容量データ・高速検索
- **マテリアルデザイン**: 統一されたアイコン・美しいUI
- **レスポンシブ**: モバイル・タブレット・デスクトップ対応
- **TypeScript**: 型安全性・IDE支援・保守性向上
- **CommonHelper連携**: 共通API・メタデータ取得
- **自動マイグレーション**: 無停止データベース更新
- **統計・分析**: リアルタイム集計・可視化
- **シリーズ管理**: 自動検出・追跡・アラート機能

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// データベース直接操作
const db = new WatchHistoryDatabase();
await db.initialize();

// 全履歴取得
const entries = await db.getAllEntries();
console.log('全履歴:', entries);

// 統計情報確認
const stats = await db.getOverallStats();
console.log('統計:', stats);

// マイグレーション状態確認
const migrationManager = new MigrationManager();
const status = await migrationManager.getPersistenceStatus();
console.log('永続化状況:', status);

// 視聴追跡テスト（視聴ページで実行）
const tracker = new WatchTracker();
// 自動初期化・追跡開始

// アプリケーション状態確認
const app = new WatchHistoryApp();
// DOM操作・UI状態確認可能
```

### 主要なDOM要素
- `#history-list` - 履歴一覧表示
- `#stats-content` - 統計画面
- `#series-content` - シリーズ管理
- `#search-input` - 検索入力

### 重要なクラス・インターフェース
- `WatchHistoryApp` - メインアプリケーション制御
- `WatchTracker` - 視聴追跡・メタデータ収集
- `WatchHistoryDatabase` - データベース操作・統計
- `MigrationManager` - マイグレーション・永続化管理
- `WatchHistoryEntry` - 履歴エントリ型定義
- `OverallStats` - 統計データ型定義

### データベーススキーマ
```javascript
// 履歴エントリ例
const entry: WatchHistoryEntry = {
  videoId: 'sm12345678',
  title: '面白い動画',
  ownerId: 'owner123',
  ownerName: '投稿者名',
  lengthSec: 600,
  watchedAt: Date.now(),
  firstWatchedAt: Date.now(),
  lastPosition: 300,
  completed: false,
  watchCount: 1,
  watchLogs: [
    { date: Date.now(), position: 300, completed: false }
  ],
  stats: { viewCount: 10000, commentCount: 500 },
  tags: ['タグ1', 'タグ2'],
  thumbnailUrl: 'https://...',
  memo: 'メモ',
  series: { id: 'series123', title: 'シリーズ名', part: 1 }
};
```

この文書を参考に、効率的にwatch-historyプロジェクトを編集できます！

## 🆕 高度な視聴履歴管理機能 詳細ガイド

### 🎯 **機能概要**
watch-historyは、ニコニコ動画の50件制限を打破し、無制限かつ高機能なローカル履歴システムを提供する画期的なSPAです。

### 📊 **管理されるデータ**
- **視聴履歴**: 動画メタデータ・進捗・完走状況・視聴回数
- **シリーズ管理**: 自動検出・進捗追跡・アラート通知
- **統計分析**: 日次・時間別・投稿者別・タグ別分析
- **視聴ログ**: 詳細な視聴セッション記録・行動分析
- **カスタムメモ**: ユーザー独自メモ・評価・分類

### 🔧 **主要機能**

#### **リアルタイム視聴追跡**
```javascript
// 15秒間隔デバウンス処理
const tracker = new WatchTracker();
// 自動初期化：メタデータ取得→進捗監視→完走判定

// 進捗記録例
tracker.recordProgress(videoId, currentTime, duration);

// 完走判定（95%閾値）
const isCompleted = (currentTime / duration) >= 0.95;
```

#### **高度な検索・フィルタ**
```javascript
// 複合条件検索
const results = await db.searchEntries({
  title: '検索ワード',
  ownerId: 'owner123',
  completed: true,
  dateRange: { start: '2024-01-01', end: '2024-12-31' },
  tags: ['タグ1', 'タグ2']
});

// ソート・ページネーション
const sorted = await db.getSortedEntries('watchedAt', 'desc', 50, 1);
```

#### **統計・分析機能**
```javascript
// 総合統計
const stats = await db.getOverallStats();
// { totalVideos: 1000, totalTime: 360000, completionRate: 0.75 }

// 日次統計
const dailyStats = await db.getDailyStats('2024-01-01', '2024-01-31');

// 投稿者別統計
const creatorStats = await db.getCreatorStats(10); // 上位10名
```

#### **シリーズ管理・アラート**
```javascript
// シリーズ自動検出
const seriesInfo = await tracker.detectSeries(title, ownerId);

// アラート設定
await db.createSeriesAlert({
  seriesId: 'series123',
  interval: 'daily', // daily/weekly/monthly
  enabled: true
});

// 進捗チェック
const progress = await db.getSeriesProgress('series123');
```

### 🎨 **UI・UX機能**
- **レスポンシブデザイン**: モバイル・タブレット・デスクトップ完全対応
- **マテリアルデザイン**: 統一されたアイコン・美しいアニメーション
- **ダークモード**: 目に優しい夜間表示（自動切替対応）
- **インクリメンタル検索**: 入力即座に結果更新・高速応答
- **無限スクロール**: 大量データの快適閲覧・遅延読み込み

### 📤 **データ管理・バックアップ**
```javascript
// エクスポート（JSON・CSV対応）
const exportData = await app.exportData('json', {
  includeStats: true,
  dateRange: { start: '2024-01-01', end: '2024-12-31' }
});

// インポート（重複チェック・マージ機能）
await app.importData(fileData, {
  mergeStrategy: 'update', // update/skip/error
  validateData: true
});

// バックアップ作成
const backup = await migrationManager.createBackup();
```

### 🔄 **自動マイグレーション**
- **無停止アップグレード**: アプリ使用中もデータ移行可能
- **段階的処理**: 大量データも安全・確実に移行
- **整合性チェック**: 移行前後でデータ検証・自動修復
- **ロールバック対応**: 問題発生時の自動復旧機能

### ⚡ **パフォーマンス最適化**
- **インデックス活用**: 高速検索・ソート・フィルタリング
- **仮想スクロール**: 大量データの軽快表示
- **デバウンス処理**: 過度なAPI呼び出し防止
- **メモリ管理**: 効率的なデータ管理・GC最適化

### 🛡️ **プライバシー・セキュリティ**
- **完全ローカル**: クラウド不要・データ外部送信なし
- **暗号化対応**: 機密データの安全保存（オプション）
- **データ削除**: 完全消去・復旧不可能削除対応

この高度な視聴履歴管理システムにより、ニコニコ動画の視聴体験が革命的に向上します！ 