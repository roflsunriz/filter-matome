# mlink-video-controller プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/mlink-video-controller/
├── index.ts                              # メインエントリーポイント (1.6KB)
├── handlers/
│   ├── mylist2.ts                        # Mylist2操作 (3.6KB)
│   ├── playback.ts                       # 再生制御ハンドラー (1.7KB)
│   ├── speed.ts                          # 再生速度ハンドラー (1.5KB)
│   └── volume.ts                         # 音量制御ハンドラー (1.9KB)
├── managers/
│   ├── comment.ts                        # コメント管理 (2.3KB)
│   ├── control.ts                        # 統合制御管理 (3.5KB)
│   ├── heatmap.ts                        # ヒートマップ管理 (25KB)
│   └── nico-api-fetcher.ts               # ニコニコAPI取得 (5.0KB)
├── module-handlers/                      # モジュール管理システム
│   ├── module-manager.ts                 # モジュール読み込み・管理 (16KB)
│   ├── module-registry.ts                # モジュール登録・管理 (8.0KB)
│   ├── settings-manager.ts               # 設定保存・読み込み (4.3KB)
│   └── settings-ui.ts                    # 設定UI管理 (39KB)
├── modules/                              # 個別機能モジュール
│   ├── background-image-settings.ts      # 背景画像設定 (19KB)
│   ├── deleted-video-detector-module.ts  # 削除動画検出モジュール (2.9KB)
│   ├── header-module.ts                  # ヘッダーモジュール (4.9KB)
│   ├── nico-info-page-module.ts          # ニコインフォページ (5.3KB)
│   ├── thumbnails-filter-module.ts       # サムネイルフィルター (23KB)
│   ├── watch-background-selector-module.ts # 背景セレクター (28KB)
│   ├── watch-harajuku-module.ts          # 原宿風Watch表示 (新規)
│   ├── watch-harajuku-style.css          # 原宿風Watch表示CSS (新規)
│   ├── watch-matrix-background-module.ts # マトリックス背景 (7.2KB)
│   ├── watch-mylist-selector-module.ts   # マイリストセレクタ (6.1KB)
│   ├── watch-tab-sessions-module.ts      # タブセッション拡張 (12KB)
│   └── watch-page-module.ts              # Watchページ統合 (26KB)
├── panels/
│   ├── base.ts                           # ベースパネル (6.1KB)
│   └── link-video.ts                     # メインUIパネル (55KB)
├── services/
│   ├── deleted-video-detector.ts         # 削除動画検出サービス (5.5KB)
│   ├── link-manager.ts                   # リンク管理サービス (8.8KB)
│   └── nico-video-player.ts              # 動画プレイヤー連携 (13KB)
├── styles/                               # CSSスタイル
│   ├── comments.ts                       # コメント用CSS (5.8KB)
│   ├── controls.ts                       # コントロール用CSS (8.3KB)
│   ├── heatmap.ts                        # ヒートマップ用CSS (3.9KB)
│   ├── panel.ts                          # パネル用CSS (3.5KB)
│   └── settings.ts                       # 設定UI用CSS (19KB)
├── templates/                            # HTMLテンプレート
│   ├── comments.ts                       # コメントテンプレート (886B)
│   ├── links.ts                          # リンクテンプレート (1.0KB)
│   ├── panel.ts                          # パネルテンプレート (1.7KB)
│   ├── playback.ts                       # 再生制御テンプレート (2.5KB)
│   ├── settings.ts                       # 設定テンプレート (3.9KB)
│   ├── speed.ts                          # 速度制御テンプレート (1.1KB)
│   └── volume.ts                         # 音量制御テンプレート (1.0KB)
└── utils/                                # ユーティリティ
    ├── dom-helper.ts                     # DOM操作補助 (1.3KB)
    ├── time-formatter.ts                 # 時間フォーマット (558B)
    └── video-util.ts                     # 動画操作ユーティリティ (2.2KB)
```

## 🏗️ アーキテクチャ概要

### モジュール管理フロー
```
module-registry.ts ─── 利用可能モジュールの登録・管理
    ↓
module-manager.ts ─── モジュールの読み込み・初期化・管理
    ↓
各modules/*.ts ─── 個別機能の実装
    ↓
settings-manager.ts ─── 設定の永続化
    ↓
settings-ui.ts ─── ユーザー向け設定UI
```

### データフロー
```
ニコニコ動画ページ
    ↓ (データ取得)
nico-api-fetcher.ts ─── APIデータ取得・前処理
    ↓
各managers/*.ts ─── データ管理・状態管理
    ↓
panels/link-video.ts ─── メインUI統合
    ↓
各ui/*.ts ─── 個別UIコンポーネント
    ↓
ユーザーインターフェース
```

### サービス連携フロー
```
nico-video-player.ts ─── 動画プレイヤー操作
    ↓
各handlers/*.ts ─── 操作ハンドラー
    ↓
各managers/*.ts ─── 状態同期
    ↓
UI更新
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - メインエントリーポイント
- **役割**: システム全体の初期化・統合
- **機能**: PanelManager、動画要素監視、SPA遷移対応
- **編集タイミング**: システム全体の初期化ロジック変更、新しいパネル追加

#### `panels/link-video.ts` - メインUIパネル（最大ファイル：55KB）
- **役割**: 全UI要素の統合・管理
- **機能**: FAB、各種制御UI、設定UI、モジュール管理UI
- **編集タイミング**: UI全体の変更、新しいタブ追加、レイアウト変更

#### `panels/base.ts` - ベースパネル
- **役割**: 共通パネル機能の提供
- **機能**: Shadow DOM、パネル開閉、外クリック監視
- **編集タイミング**: パネルの共通動作変更、新しいパネル作成時

### 🔧 **モジュール管理システム（このプロジェクトの中核）**

#### `module-handlers/module-manager.ts` - モジュール管理
- **役割**: モジュールのライフサイクル管理
- **機能**: 読み込み、初期化、有効/無効切替、依存関係管理、排他グループ
- **編集タイミング**: 新しいモジュール追加、読み込み方式変更、依存関係変更

#### `module-handlers/module-registry.ts` - モジュール登録
- **役割**: 利用可能モジュールの定義・管理
- **機能**: モジュール設定登録、カテゴリ分類、ページ対応管理
- **編集タイミング**: 新しいモジュール追加、モジュール設定変更

#### `module-handlers/settings-manager.ts` - 設定管理
- **役割**: モジュール設定の永続化
- **機能**: localStorage操作、設定変更監視、インポート/エクスポート
- **編集タイミング**: 新しい設定項目追加、保存形式変更

#### `module-handlers/settings-ui.ts` - 設定UI（2番目に大きなファイル：39KB）
- **役割**: ユーザー向け設定インターフェース
- **機能**: モジュール一覧、有効/無効切替、背景画像設定、設定インポート/エクスポート
- **編集タイミング**: 設定UIの変更、新しい設定画面追加

### 🎨 **個別機能モジュール**

#### `modules/watch-background-selector-module.ts` - 背景セレクター（最大モジュール：28KB）
- **役割**: ラジアル背景選択UI
- **機能**: Shadow DOM、ラジアル選択、背景画像管理、設定連携
- **編集タイミング**: 背景選択UI変更、新しい背景タイプ追加

#### `modules/watch-harajuku-module.ts` - 原宿風Watch表示
- **役割**: Watchページをニコニコ動画（原宿）風のビジュアルに変更
- **機能**: 原宿風CSS注入、再生数・コメント数・マイリスト数・投稿日時の集約表示、ライト/ダークテーマ切替、背景セレクターとの同時使用、SPA遷移対応
- **編集タイミング**: 原宿風レイアウトの調整、テーマボタンやメタ情報表示の変更

#### `modules/watch-page-module.ts` - Watchページ統合（26KB）
- **役割**: Watchページの各種機能統合
- **機能**: タグカウンター、ヘッダー一行化、サブモジュール管理
- **編集タイミング**: Watchページ機能追加・修正

#### `modules/thumbnails-filter-module.ts` - サムネイルフィルター（23KB）
- **役割**: 動画サムネイル非表示機能
- **機能**: キーワードフィルタリング、正規表現対応、設定UI
- **編集タイミング**: フィルター機能拡張、新しいフィルター条件追加

#### `modules/background-image-settings.ts` - 背景画像設定（19KB → 拡張済み）
- **役割**: 背景画像データ管理・永続化
- **機能**: 
  - IndexedDB操作、画像データ管理、インポート/エクスポート
  - **🆕 永続化ストレージ昇格**: ブラウザクリーンアップ時のデータ保護
  - **🆕 自動マイグレーション**: データベーススキーマ変更時の自動移行
  - **🆕 データベース修復**: 破損検知・自動修復・バックアップ復元
  - **🆕 起動時自己修復**: 必須ストア・インデックス不足を検出した場合はDBを一度だけ削除・再作成
  - **🆕 自動バックアップ**: 5世代自動バックアップ・リストア機能
- **編集タイミング**: 画像管理機能拡張、新しい画像形式対応、マイグレーション処理追加

#### `modules/watch-tab-sessions-module.ts` - タブセッション拡張（12KB）
- **役割**: localStorage 読み取りをフィルタしてタブセッション上限を実質的に緩和
- **機能**: getItem/storageイベントのフック、プロパティアクセサ上書き、自タブ優先フィルタ、解析失敗時の安全なフォールバック
- **編集タイミング**: フィルタポリシー調整、対象キー変更、互換性検証が必要なとき

#### その他モジュール
- `header-module.ts` - ヘッダープライバシー機能
- `nico-info-page-module.ts` - ニコニ広告お知らせページ機能
- `watch-matrix-background-module.ts` - マトリックス背景
- `watch-mylist-selector-module.ts` - マイリストセレクタ
- `watch-tab-sessions-module.ts` - タブセッション読み取りフィルタ
- `deleted-video-detector-module.ts` - 削除動画検出

### 🔌 **サービス層**

#### `services/nico-video-player.ts` - 動画プレイヤー連携（13KB）
- **役割**: ニコニコ動画プレイヤーとの橋渡し
- **機能**: 再生制御、音量制御、速度制御、状態監視
- **編集タイミング**: プレイヤーAPI変更対応、新しい制御機能追加

#### `services/link-manager.ts` - リンク管理（8.8KB）
- **役割**: 各種リンクの生成・管理
- **機能**: スレッドID取得、アクション処理、動的リンク生成
- **編集タイミング**: 新しいリンク追加、アクション機能拡張

#### `services/deleted-video-detector.ts` - 削除動画検出（5.5KB）
- **役割**: 削除動画の検出・リダイレクト
- **機能**: URL監視、動画可用性チェック、自動リダイレクト
- **編集タイミング**: 検出ロジック改善、新しいリダイレクト先追加

### 💾 **データ・状態管理**

#### `managers/heatmap.ts` - ヒートマップ管理（3番目に大きなファイル：25KB）
- **役割**: コメント密度ヒートマップ表示
- **機能**: Canvas描画、FAB表示、オーバーレイ表示、SPA対応、設定保存
- **編集タイミング**: ヒートマップ表示改善、新しい表示モード追加

#### `managers/nico-api-fetcher.ts` - API取得（5.0KB）
- **役割**: ニコニコAPIデータ取得・管理
- **機能**: コメントデータ取得、検索機能、密度データ生成
- **編集タイミング**: API仕様変更対応、新しいデータ取得機能追加

#### `managers/control.ts` - 統合制御管理（3.5KB）
- **役割**: 各種制御機能の統合
- **機能**: 再生制御、シーク、音量、速度の統合管理
- **編集タイミング**: 制御機能追加、統合ロジック変更

#### `managers/comment.ts` - コメント管理（2.3KB）
- **役割**: コメントデータの管理
- **機能**: コメント取得、検索、時間指定カウント
- **編集タイミング**: コメント機能拡張、新しい検索機能追加

### 🎮 **操作ハンドラー**

#### `handlers/` - 各種操作ハンドラー
- `mylist2.ts` - Mylist2操作
- `playback.ts` - 再生制御
- `speed.ts` - 再生速度制御
- `volume.ts` - 音量制御
- **編集タイミング**: 対応する操作機能の追加・修正

### 🎨 **UI・インターフェース**

#### `templates/` - HTMLテンプレート
- **役割**: UI構造の定義
- **機能**: HTML文字列生成、テンプレート管理
- **編集タイミング**: UI構造変更、新しいテンプレート追加

#### `styles/` - CSSスタイル
- **役割**: UIデザインの定義
- **機能**: CSS文字列生成、レスポンシブ対応
- **編集タイミング**: デザイン変更、新しいスタイル追加

### 🛠️ **ユーティリティ**

#### `utils/` - 共通ユーティリティ
- `dom-helper.ts` - DOM操作補助
- `time-formatter.ts` - 時間フォーマット
- `video-util.ts` - 動画操作ユーティリティ
- **編集タイミング**: 共通機能追加、ユーティリティ拡張

## 🎯 目的別編集ガイド

### 💡 **新しいモジュールを追加したい**
1. `modules/新しいモジュール.ts` - モジュール実装
2. `module-handlers/module-registry.ts` - モジュール登録
3. `module-handlers/module-manager.ts` - 読み込み処理追加
4. `src/types/module-types.ts` - 型定義追加（必要に応じて）

### 🎨 **UIを変更・追加したい**
1. `templates/対象テンプレート.ts` - HTML構造変更
2. `styles/対象スタイル.ts` - CSS・デザイン変更
3. `panels/link-video.ts` - イベント処理・動作変更

### 🔄 **動画プレイヤー連携を拡張したい**
1. `services/nico-video-player.ts` - 基本機能追加
2. `handlers/対象ハンドラー.ts` - 操作ハンドラー追加
3. `managers/control.ts` - 統合管理に追加

### 💾 **新しい設定項目を追加したい**
1. `src/types/module-types.ts` - 型定義追加
2. `module-handlers/settings-manager.ts` - 保存/読み込み処理
3. `module-handlers/settings-ui.ts` - 設定UI追加
4. `modules/対象モジュール.ts` - モジュール側で設定利用

### 🎯 **ヒートマップ機能を拡張したい**
- **メイン対象**: `managers/heatmap.ts`
- **スタイル**: `styles/heatmap.ts`

### 🔍 **コメント機能を拡張したい**
1. `managers/nico-api-fetcher.ts` - データ取得・処理
2. `managers/comment.ts` - コメント管理機能

### 🖼️ **背景機能を拡張したい**
1. `modules/background-image-settings.ts` - 画像データ管理
2. `modules/watch-background-selector-module.ts` - 選択UI
3. `modules/watch-matrix-background-module.ts` - アニメーション背景（参考）

#### 🆕 **背景画像データベースの新機能**
- **永続化昇格**: `requestPersistentStorage()` - ブラウザによる自動削除を防止
- **自動マイグレーション**: データベーススキーマ変更時の自動移行処理
- **データ修復**: `repairDatabase()` - 破損データの検知と自動修復
- **バックアップ管理**: `createAutoBackup()`, `restoreFromBackup()` - 5世代自動バックアップ
- **システム監視**: `getSystemStatus()` - ストレージ使用量・整合性・マイグレーション状態の監視

### 🔧 **フィルター機能を拡張したい**
- **メイン対象**: `modules/thumbnails-filter-module.ts`
- **新しいフィルター**: 新しいモジュールとして実装を推奨

### 🚀 **パフォーマンスを改善したい**
- **モジュール読み込み**: `module-handlers/module-manager.ts`
- **UI描画**: `panels/link-video.ts`
- **データ処理**: 各`managers/*.ts`

### 🔌 **外部サービス連携を追加したい**
1. `services/新しいサービス.ts` - サービス実装
2. `handlers/新しいハンドラー.ts` - 操作ハンドラー
3. モジュールとして統合

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **モジュール追加時**: `module-handlers/module-registry.ts` (登録)
- **設定変更時**: `src/types/module-types.ts` (型定義)
- **UI変更時**: Shadow DOM対応確認 (`panels/base.ts`)

### 🚨 **変更時の影響範囲**
- `module-handlers/module-manager.ts` 変更 → 全モジュールに影響
- `panels/link-video.ts` 変更 → UI全体に影響
- `services/nico-video-player.ts` 変更 → 動画制御全体に影響
- `managers/heatmap.ts` 変更 → ヒートマップ機能全体に影響

### 📝 **コーディング規約**
- デバッグログは`window.logger?.debug/info/warn/error`を使用
- エラーハンドリングは必須
- モジュールは`ModuleInstance`インターフェースを実装
- Shadow DOMを適切に使用（外部CSS影響回避）
- 大量ログ回避のため、高頻度処理のログは条件付きで出力

### 🎯 **モジュール設計原則**
- 各モジュールは独立して動作可能
- 排他グループ機能を適切に使用
- 依存関係は最小限に抑制
- 初期化・破棄処理を確実に実装

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// モジュールマネージャーにアクセス
window.ModuleManagerInstance

// 特定のモジュールにアクセス
window.ModuleManagerInstance.getLoadedModulesMap()

// 設定データを確認
window.SettingsManagerInstance.getAllSettings()

// ヒートマップマネージャーにアクセス
window.HeatmapManagerInstance

// 🆕 背景画像データベースの監視・管理
const bgSettings = BackgroundImageSettings.getInstance();

// システム状態を確認
await bgSettings.getSystemStatus()

// ストレージ使用量を確認
await bgSettings.getStorageUsage()

// バックアップ一覧を確認
bgSettings.getAvailableBackups()

// データベース修復を実行
await bgSettings.repairDatabase()

// マイグレーション履歴を確認
await bgSettings.getMigrationHistory()
```

### 主要なイベント
- `ModuleLoaded` - モジュール読み込み完了
- `ModuleEnabled/Disabled` - モジュール有効/無効切替
- `SettingsChanged` - 設定変更
- `HeatmapDisplayModeChanged` - ヒートマップ表示モード変更

#### 🆕 **背景画像データベースイベント**
- `persistenceEnabled` - 永続化ストレージが有効化
- `migrationCompleted/migrationFailed` - マイグレーション完了/失敗
- `databaseRepaired` - データベース修復完了
- `restoredFromBackup` - バックアップからの復元完了
- `imageAdded/imageDeleted` - 背景画像追加/削除
- `settingsImported/settingsReset` - 設定インポート/リセット

### デバッグモード
```javascript
// デバッグログを有効化
localStorage.setItem('debug_module_manager', 'true');

// 特定モジュールのデバッグ
window.ModuleManagerInstance.getModuleStatus('module_id');
```

この文書を参考に、効率的にmlink-video-controllerプロジェクトを編集できます！ 
