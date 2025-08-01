# mylist2 プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/mylist2/
├── index.html                            # メインHTML (283行)
├── index.ts                              # メインエントリーポイント (34行)
├── header-adjustments.ts                 # ヘッダー位置調整 (26行)
├── service-worker.ts                     # Service Worker (165行)
├── components/
│   ├── database.ts                       # IndexedDB管理 (81行)
│   ├── manager-refactored.ts             # メインマネージャー (136行)
│   └── selector.ts                       # マイリスト選択モーダル (323行)
├── services/
│   ├── api-service.ts                    # API関連サービス (239行)
│   ├── database-management-service.ts    # データベース管理・永続化昇格 (350行)
│   ├── import-export-service.ts          # インポート・エクスポート (175行)
│   ├── keyword-service.ts                # キーワード管理 (153行)
│   ├── mylist-service.ts                 # マイリスト管理 (133行)
│   ├── settings-service.ts               # 設定管理 (49行)
│   └── video-service.ts                  # 動画管理 (163行)
└── ui/
    ├── ui-refactored.ts                  # メインUI (1000行超)
    ├── styles.ts                         # CSSスタイル (1182行)
    ├── batch-operations.ts               # 一括操作 (190行)
    ├── event-handlers.ts                 # イベントハンドラー (394行)
    ├── modal-service.ts                  # モーダル関連 (201行)
    ├── progress-service.ts               # プログレス表示 (85行)
    ├── file-helper-service.ts            # ファイル操作ヘルパー (65行)
    └── validation-service.ts             # バリデーション (6行)
```

## 🏗️ アーキテクチャ概要

### データフロー
```
ユーザー操作 (UI)
    ↓
Mylist2ManagerUI ─── イベント処理・画面更新
    ↓
Mylist2Manager ─── ビジネスロジック・統合管理
    ↓
各種Service (MylistService, VideoService等) ─── 専門的な処理
    ↓
Mylist2DB ─── IndexedDBへのデータ永続化
```

### API連携フロー
```
ニコニコ動画API
    ↓ (動画情報取得)
ApiService ─── レート制限・キューイング・キャッシュ
    ↓
VideoService ─── 動画データ管理
    ↓
Mylist2DB ─── データ保存
    ↓
UI更新 ─── 最新情報表示
```

### UI・操作フロー
```
UI操作 (ui-refactored.ts)
    ↓
EventHandlers ─── イベント処理
    ↓
BatchOperations ─── 一括操作処理
    ↓
ModalService ─── 確認・選択ダイアログ
    ↓
ProgressService ─── 進捗表示
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - メインエントリーポイント
- **役割**: システム全体の初期化・統合
- **機能**: グローバル変数設定、共通ヘッダー初期化、メインUI起動
- **編集タイミング**: システム全体の初期化ロジック変更、新モジュール統合

#### `components/manager-refactored.ts` - メインマネージャー
- **役割**: 全サービスの統合・ビジネスロジック管理
- **機能**: 各サービスの統合、公開API提供、データベースアクセス管理
- **編集タイミング**: 新機能追加、サービス間連携変更、APIインターフェース変更

#### `components/database.ts` - データベース管理
- **役割**: IndexedDBのスキーマ・マイグレーション管理・永続化昇格
- **機能**: DB初期化、バージョン管理、ストア作成、高度な自動マイグレーション、永続化要求、健全性チェック、バックアップ・復元
- **編集タイミング**: データ構造変更、新テーブル追加、マイグレーション必要時

### 🎨 **UI・インターフェース**

#### `ui/ui-refactored.ts` - メインUI (最も大きなファイル)
- **役割**: 全UI操作・表示制御・イベント統合
- **機能**: 画面レンダリング、イベントリスナー、検索機能、設定管理
- **編集タイミング**: UI機能追加、表示変更、新しい操作機能追加

#### `ui/styles.ts` - CSSスタイル
- **役割**: 全画面のスタイル・レイアウト定義
- **機能**: CSS定義、レスポンシブ対応、ダークテーマ、アニメーション
- **編集タイミング**: デザイン変更、新UI要素追加、レイアウト調整

#### `index.html` - メインHTML
- **役割**: 基本HTML構造・テンプレート定義
- **機能**: DOM構造、テンプレート、モーダル、プログレスバー
- **編集タイミング**: HTML構造変更、新しいモーダル追加、テンプレート修正

#### `header-adjustments.ts` - ヘッダー調整
- **役割**: mylist2環境専用のヘッダー位置調整
- **機能**: CSS Custom Properties調整、位置補正
- **編集タイミング**: ヘッダーデザイン変更対応、レイアウト調整

### 💾 **データ・サービス**

#### `services/mylist-service.ts` - マイリスト管理
- **役割**: マイリストCRUD操作
- **機能**: マイリスト作成・削除・更新・ソート
- **編集タイミング**: マイリスト機能追加・修正

#### `services/video-service.ts` - 動画管理
- **役割**: 動画データCRUD操作
- **機能**: 動画追加・削除・更新・ソート・重複チェック
- **編集タイミング**: 動画管理機能追加・修正

#### `services/keyword-service.ts` - キーワード管理
- **役割**: キーワードCRUD操作
- **機能**: キーワード追加・削除・移動・編集・重複チェック
- **編集タイミング**: キーワード機能追加・修正

#### `services/api-service.ts` - API関連
- **役割**: ニコニコ動画API操作・レート制限管理
- **機能**: 動画情報取得、キューイング、キャッシュ、レート制限
- **編集タイミング**: API仕様変更対応、パフォーマンス改善

#### `services/database-management-service.ts` - データベース管理・永続化昇格
- **役割**: データベースの高度な管理・永続化昇格・健全性監視
- **機能**: 
  - 永続化昇格要求・状態監視
  - 自動データベース健全性チェック
  - バックアップ・復元機能
  - 自動バックアップスケジューリング
  - ストレージ使用量監視・警告
  - マイグレーション進捗監視
  - 孤立データ検出・修復
  - メタデータ管理
- **編集タイミング**: データベース監視機能追加、バックアップ戦略変更、永続化要求ロジック調整

#### `services/import-export-service.ts` - インポート・エクスポート
- **役割**: データのインポート・エクスポート処理
- **機能**: JSONエクスポート、レガシーデータインポート、プログレス管理
- **編集タイミング**: データ形式変更、インポート機能追加

#### `services/settings-service.ts` - 設定管理
- **役割**: アプリケーション設定の永続化
- **機能**: 設定保存・読み込み、デフォルト値管理
- **編集タイミング**: 新設定項目追加、設定形式変更

### 🎭 **UI補助・操作**

#### `ui/event-handlers.ts` - イベントハンドラー
- **役割**: 個別操作のイベント処理
- **機能**: 動画・キーワードの移動・コピー・削除・編集処理
- **編集タイミング**: 新操作追加、イベント処理ロジック変更

#### `ui/batch-operations.ts` - 一括操作
- **役割**: 複数選択アイテムの一括処理
- **機能**: 一括移動・コピー・削除・情報更新
- **編集タイミング**: 一括操作機能追加・改善

#### `ui/modal-service.ts` - モーダル管理
- **役割**: 各種ダイアログ・モーダル表示
- **機能**: アラート・確認・選択・編集モーダル
- **編集タイミング**: 新モーダル追加、UI改善

#### `ui/progress-service.ts` - プログレス表示
- **役割**: 長時間処理の進捗表示
- **機能**: 円形プログレスバー、進捗計算、表示制御
- **編集タイミング**: プログレス表示改善、新進捗タイプ追加

#### `components/selector.ts` - マイリスト選択
- **役割**: マイリスト選択用の専用モーダル
- **機能**: おすすめマイリスト表示、検索、新規作成
- **編集タイミング**: 選択機能改善、おすすめロジック変更

### 🛠️ **ユーティリティ**

#### `ui/file-helper-service.ts` - ファイル操作ヘルパー
- **役割**: ファイル操作・データ変換支援
- **機能**: ダウンロード、ファイル読み込み、日時フォーマット、長さ解析
- **編集タイミング**: 新ファイル形式対応、変換ロジック追加

#### `ui/validation-service.ts` - バリデーション
- **役割**: 入力データの検証・サニタイズ
- **機能**: 入力値検証、HTML エスケープ
- **編集タイミング**: セキュリティ強化、新検証ルール追加

#### `service-worker.ts` - Service Worker
- **役割**: オフライン対応・キャッシュ管理
- **機能**: 静的リソースキャッシュ、サムネイルキャッシュ、オフライン対応
- **編集タイミング**: キャッシュ戦略変更、オフライン機能強化

## 🎯 目的別編集ガイド

### 💡 **新しいマイリスト機能を追加したい**
1. `services/mylist-service.ts` - サービスロジック実装
2. `components/manager-refactored.ts` - 公開API追加
3. `ui/ui-refactored.ts` - UI操作・表示追加
4. `ui/styles.ts` - 必要なスタイル追加
5. `components/database.ts` - データ構造変更が必要な場合

### 🎬 **動画管理機能を強化したい**
1. `services/video-service.ts` - 動画操作ロジック変更
2. `services/api-service.ts` - API連携が必要な場合
3. `ui/event-handlers.ts` - 個別操作イベント
4. `ui/batch-operations.ts` - 一括操作が必要な場合
5. `ui/ui-refactored.ts` - UI表示更新

### 🔍 **キーワード機能を拡張したい**
1. `services/keyword-service.ts` - キーワード管理ロジック
2. `ui/event-handlers.ts` - キーワード操作イベント
3. `ui/ui-refactored.ts` - キーワード表示・検索機能
4. `components/selector.ts` - おすすめ機能が関連する場合

### 🎨 **UIデザインを変更したい**
1. `ui/styles.ts` - CSS・デザイン変更
2. `index.html` - HTML構造変更
3. `ui/ui-refactored.ts` - 動的スタイル・レンダリング変更
4. `ui/modal-service.ts` - モーダルデザイン変更

### 💾 **データ構造を変更したい**
1. `components/database.ts` - スキーマ変更・マイグレーション
2. `src/types/mylist-types.ts` - 型定義更新
3. `services/*-service.ts` - 対応するサービス更新
4. `ui/ui-refactored.ts` - UI表示調整

### 🔄 **インポート・エクスポート機能を追加したい**
1. `services/import-export-service.ts` - 処理ロジック実装
2. `ui/file-helper-service.ts` - ファイル操作支援
3. `ui/ui-refactored.ts` - UI操作追加
4. `ui/progress-service.ts` - 進捗表示が必要な場合

### 🚀 **パフォーマンスを改善したい**
- **API処理**: `services/api-service.ts` - キューイング・キャッシュ最適化
- **データベース**: `services/*-service.ts` - クエリ最適化
- **UI描画**: `ui/ui-refactored.ts` - 仮想化・遅延読み込み
- **一括処理**: `ui/batch-operations.ts` - バッチサイズ・並列処理調整

### 🔌 **外部連携を追加したい**
1. 新しいサービスファイルを`services/`に作成
2. `components/manager-refactored.ts`で統合
3. `ui/ui-refactored.ts`でUI追加
4. 必要に応じて`index.ts`で初期化

### 🛡️ **データベース管理機能を活用したい**
1. `components/database.ts` - データベース層の高度機能
2. `services/database-management-service.ts` - 管理サービス層
3. `components/manager-refactored.ts` - 統合API提供
4. `ui/ui-refactored.ts` - UI側からの呼び出し

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **データ変更時**: `src/types/mylist-types.ts`, `src/types/video-types.ts` (型定義)
- **新機能追加時**: `components/manager-refactored.ts` (統合)
- **UI変更時**: `ui/styles.ts` (スタイル統合)

### 🚨 **変更時の影響範囲**
- `components/database.ts` 変更 → データマイグレーション必要
- `components/manager-refactored.ts` 変更 → 全UI機能に影響
- `ui/ui-refactored.ts` 変更 → 画面表示全体に影響
- `services/*-service.ts` 変更 → 対応する機能全体に影響

### 📝 **コーディング規約**
- デバッグログは`window.logger?.debug/info/warn/error`を使用
- エラーハンドリングは必須（try-catch）
- 大量ログ回避のため、高頻度処理のログは条件付きで出力
- サービス分離: 各機能は専用サービスで管理
- UI分離: UIロジックとビジネスロジックを分離

### 🔧 **アーキテクチャ原則**
- **サービス指向**: 機能別にサービスクラスで分離
- **レイヤー分離**: UI ← Manager ← Service ← Database
- **依存性注入**: コンストラクターでサービス注入
- **型安全性**: TypeScript型定義を活用

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// メインインスタンスにアクセス
window.Mylist2Manager
window.Mylist2ManagerUI
window.Mylist2DB

// データベース直接操作（開発用）
const db = new window.Mylist2DB();
const database = await db.initDB();

// マネージャー経由でのデータアクセス
const manager = new window.Mylist2Manager();
const mylists = await manager.getAllMylists();

// 新しいデータベース管理機能の使用例
// 永続化昇格要求
const persistResult = await manager.requestDatabasePersistence();
console.log('永続化要求結果:', persistResult);

// データベース健全性チェック
const health = await manager.performDatabaseHealthCheck();
console.log('データベース健全性:', health);

// バックアップ作成
const backupResult = await manager.createDatabaseBackup();
if (backupResult.success) {
  console.log('バックアップ作成成功');
  // バックアップデータをファイルに保存することも可能
}

// ストレージ使用量監視
const storageUsage = await manager.monitorDatabaseStorageUsage();
console.log('ストレージ使用量:', storageUsage);

// 自動健全性チェック開始
manager.startAutoDatabaseHealthCheck();

// 自動バックアップスケジューリング（24時間毎）
await manager.scheduleAutoDatabaseBackup(24);

// マイグレーション進捗監視
manager.setDatabaseMigrationProgressCallback((progress) => {
  console.log('マイグレーション進捗:', progress);
});
```

### 主要なイベント・状態
- IndexedDBマイグレーション: `database.ts`の`onupgradeneeded`
- API レート制限: `api-service.ts`の`API_RATE_LIMIT`
- UI状態管理: `ui-refactored.ts`の`currentMylistId`
- データベース健全性チェック: `database-management-service.ts`の定期実行
- 永続化状態監視: `database-management-service.ts`の永続化要求・状態確認

### パフォーマンス確認ポイント
- API 呼び出し頻度: `api-service.ts`のキューイング状況
- データベース操作: IndexedDBの応答時間
- UI描画: 大量データ表示時のパフォーマンス

## 🆕 新機能: データベース永続化昇格・自動マイグレーション機能

### 🛡️ 追加された機能

#### **データベース永続化昇格機能**
- **ブラウザ永続化要求**: ユーザー同意の下でデータベースを永続化
- **ストレージ容量監視**: 使用量・残量・警告表示
- **永続化状態確認**: 現在の永続化状態を確認

#### **高度な自動マイグレーション機能**
- **段階的マイグレーション**: バージョン毎の詳細制御
- **進捗監視**: マイグレーション進捗のリアルタイム表示
- **失敗時回復**: エラー時の自動回復機能
- **履歴管理**: マイグレーション履歴の記録・追跡

#### **データベース健全性チェック機能**
- **自動健全性チェック**: 定期的な整合性検証
- **孤立データ検出**: 参照整合性の確認・修復
- **メタデータ管理**: データベース状態の詳細記録
- **警告通知**: 問題発生時の自動通知

#### **バックアップ・復元機能**
- **完全バックアップ**: 全データの JSON 形式バックアップ
- **自動バックアップ**: スケジュール化された定期バックアップ
- **復元機能**: バックアップからの完全復元
- **バックアップ履歴**: バックアップ作成日時の記録

### 🔧 使用方法

```javascript
// 基本的な使用例
const manager = new window.Mylist2Manager();

// 永続化昇格要求
await manager.requestDatabasePersistence();

// 健全性チェック
const health = await manager.performDatabaseHealthCheck();

// バックアップ作成
const backup = await manager.createDatabaseBackup();

// 自動機能開始
manager.startAutoDatabaseHealthCheck();
await manager.scheduleAutoDatabaseBackup(24);
```

### 📈 効果
- **データ保護**: ブラウザによる自動削除を防止
- **信頼性向上**: 定期的な健全性チェックでデータ整合性確保
- **災害復旧**: 自動バックアップによる安全なデータ復旧
- **運用効率**: 自動監視によるメンテナンス負荷軽減

この文書を参考に、効率的にmylist2プロジェクトを編集できるのじゃ！ 