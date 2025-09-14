# comment-filter2 プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
features/src/comment-filter2/
├── index.ts                              # メインエントリーポイント
├── components/
│   └── ui-manager.ts                     # UI管理・設定画面 (53KB)
├── filter/
│   ├── comment-filter.ts                 # 旧形式フィルター (24KB)
│   └── json-comment-filter.ts            # JSON形式フィルター (21KB)
├── proxy/
│   └── data-interceptor.ts               # API傍受・データ取得 (11KB)
├── integrations/
│   └── video-player-bridge.ts            # video_player連携 (16KB)
├── storage/
│   └── indexed-db.ts                     # データ保存・設定管理・永続化昇格 (34KB)
├── templates/
│   └── main-ui.ts                        # HTMLテンプレート (19KB)
├── styles/
│   └── main.ts                           # CSSスタイル (19KB)
└── utils/
    ├── constants.ts                      # 定数定義 (953B)
    ├── filter-helper.ts                  # フィルター補助 (2.6KB)
    ├── filter-logger.ts                  # ログ送信 (6.2KB)
    ├── jsonl-parser.ts                   # JSON/JSONL解析 (8.6KB)
    ├── legacy-converter.ts               # レガシー設定変換 (12KB)
    ├── sanitizer.ts                      # データサニタイズ (7KB)
    └── csv.ts                            # CSV解析 (2.4KB)
```

## 🏗️ アーキテクチャ概要

### データフロー
```
ニコニコ動画API
    ↓ (傍受)
data-interceptor.ts ─── コメントデータ取得・前処理
    ↓
json-comment-filter.ts ─── フィルタリング処理
    ↓
video-player-bridge.ts ─── video_playerへデータ送信
    ↓
ニコニコ動画プレイヤー表示
```

### UI・設定フロー
```
ui-manager.ts ─── ユーザー操作・設定変更
    ↓
indexed-db.ts ─── 設定・ルール保存
    ↓
json-comment-filter.ts ─── 保存されたルールでフィルタリング
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - メインエントリーポイント
- **役割**: 全システムの初期化・統合
- **機能**: キーボードショートカット、イベント監視、各モジュール統合
- **編集タイミング**: システム全体の挙動変更、初期化ロジック変更

#### `filter/json-comment-filter.ts` - メインフィルター
- **役割**: 現在のメインフィルタリングエンジン
- **機能**: JSON形式ルール処理、正規表現・ユーザーID・ニコる数フィルタリング
- **編集タイミング**: フィルター機能追加・修正、新しいルールタイプ追加

#### `filter/comment-filter.ts` - レガシーフィルター
- **役割**: 旧形式互換フィルター（現在は非推奨）
- **機能**: 旧形式ルール処理
- **編集タイミング**: 旧バージョン互換性が必要な場合のみ

### 🎨 **UI・インターフェース**

#### `components/ui-manager.ts` - UI管理 (最も大きなファイル)
- **役割**: 設定画面・ルール管理UI
- **機能**: Shadow DOM、設定画面、ルール追加/削除、インポート/エクスポート
- **編集タイミング**: UI変更、新機能追加、設定項目追加

#### `templates/main-ui.ts` - HTMLテンプレート
- **役割**: UIのHTML構造定義
- **機能**: 設定画面のHTML、フォーム要素
- **編集タイミング**: UI構造変更、新しい設定項目追加

#### `styles/main.ts` - CSSスタイル
- **役割**: UIのスタイル定義
- **機能**: CSS、アニメーション、レスポンシブ対応
- **編集タイミング**: デザイン変更、新しいUIコンポーネント追加

### 💾 **データ・ストレージ**

#### `proxy/data-interceptor.ts` - API傍受
- **役割**: ニコニコ動画APIの傍受・データ取得
- **機能**: fetch API hook、SPA対応、SMID抽出
- **編集タイミング**: API仕様変更対応、新しいエンドポイント対応

#### `storage/indexed-db.ts` - データ保存・永続化昇格
- **役割**: 設定・ルールの永続化・データベース管理
- **機能**: 
  - IndexedDB操作、データ移行、インポート/エクスポート
  - **🆕 永続化昇格**: 完全性チェック、自動修復、バックアップ・復元
  - **🆕 自動マイグレーション**: 履歴記録、段階的移行、データ検証
  - **🆕 パフォーマンス最適化**: 重複削除、データ整合性確保
- **編集タイミング**: 新しい設定項目追加、データ形式変更、データベース強化

### 🔌 **連携・統合**

#### `integrations/video-player-bridge.ts` - video_player連携
- **役割**: video_playerライブラリとの橋渡し
- **機能**: フィルタリング済みデータ送信、動画プレイヤー同期
- **編集タイミング**: video_player仕様変更対応、連携機能追加

### 🛠️ **ユーティリティ**

#### `utils/constants.ts` - 定数定義
- **役割**: システム全体で使用する定数
- **機能**: API エンドポイント、イベント名、設定デフォルト値
- **編集タイミング**: 新しい定数追加、設定値変更

#### `utils/jsonl-parser.ts` - データ解析
- **役割**: JSON/JSONL形式のデータ解析・変換
- **機能**: ルールの解析、検証、正規化
- **編集タイミング**: 新しいデータ形式対応、ルール形式拡張

#### `utils/sanitizer.ts` - データサニタイズ
- **役割**: 入力データの安全性確保
- **機能**: 正規表現、コメント本文、コマンドのサニタイズ
- **編集タイミング**: セキュリティ強化、新しい入力形式対応

## 🎯 目的別編集ガイド

### 💡 **新しいフィルター機能を追加したい**
1. `utils/constants.ts` - 必要な定数を追加
2. `filter/json-comment-filter.ts` - フィルタリングロジック実装
3. `components/ui-manager.ts` - 設定UI追加
4. `templates/main-ui.ts` - HTML要素追加
5. `styles/main.ts` - スタイル追加

### 🐛 **フィルタリングのバグを修正したい**
- **メイン対象**: `filter/json-comment-filter.ts`
- **補助対象**: `utils/sanitizer.ts`, `utils/jsonl-parser.ts`

### 🎨 **UIをカスタマイズしたい**
1. `templates/main-ui.ts` - HTML構造変更
2. `styles/main.ts` - CSS・デザイン変更
3. `components/ui-manager.ts` - イベントハンドラー・動作変更

### 💾 **新しい設定項目を追加したい**
1. `src/types/filter-types.ts` - 型定義追加
2. `storage/indexed-db.ts` - 保存/読み込み処理
3. `components/ui-manager.ts` - UI制御
4. `templates/main-ui.ts` - HTML要素
5. `styles/main.ts` - スタイル

### 🔄 **データ形式を変更したい**
1. `storage/indexed-db.ts` - DBスキーマ変更・移行処理
2. `utils/jsonl-parser.ts` - 解析ロジック変更
3. `utils/legacy-converter.ts` - 変換ロジック追加

### 🛡️ **データベースの完全性を確保したい**
1. `storage/indexed-db.ts` - `checkDatabaseIntegrity()` で完全性チェック
2. `storage/indexed-db.ts` - `repairDatabase()` で自動修復実行
3. `storage/indexed-db.ts` - `optimizeDatabase()` でパフォーマンス最適化

### 💾 **データをバックアップ・復元したい**
1. `storage/indexed-db.ts` - `createFullBackup()` で完全バックアップ作成
2. `storage/indexed-db.ts` - `restoreFromBackup()` でデータ復元
3. `storage/indexed-db.ts` - `getMigrationHistory()` で履歴確認

### 🚀 **パフォーマンスを改善したい**
- **API処理**: `proxy/data-interceptor.ts`
- **フィルタリング**: `filter/json-comment-filter.ts`
- **UI**: `components/ui-manager.ts`

### 🔌 **外部連携を追加したい**
- **ベース**: `integrations/video-player-bridge.ts`を参考に新しい連携ファイル作成
- **フロー**: `index.ts`で統合

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **設定変更時**: `src/types/filter-types.ts` (型定義)
- **機能追加時**: `utils/constants.ts` (定数追加)
- **UI変更時**: Shadow DOM対応 (`components/ui-manager.ts`)

### 🚨 **変更時の影響範囲**
- `utils/constants.ts` 変更 → 全ファイルに影響
- `filter/json-comment-filter.ts` 変更 → フィルタリング全体に影響
- `storage/indexed-db.ts` 変更 → データ移行が必要な場合あり
- **🆕 データベース機能変更** → 完全性チェック・バックアップ推奨

### 📝 **コーディング規約**
- デバッグログは`window.logger?.debug/info/warn/error`を使用
- エラーハンドリングは必須
- 大量ログ回避のため、高頻度処理のログは条件付きで出力

## 🔍 デバッグ・テスト

### コンソールからのアクセス
```javascript
// メインインスタンスにアクセス
window.CommentFilter2Instance

// グローバルデータを確認
window[Symbol.for('CommentFilter2GlobalData')]

// デバッグ情報取得
window.CommentFilter2Instance.getDebugInfo()

// 🆕 データベース永続化昇格機能のテスト
await window.CommentFilter2Instance.storage.checkDatabaseIntegrity()
await window.CommentFilter2Instance.storage.repairDatabase()
await window.CommentFilter2Instance.storage.optimizeDatabase()

// 🆕 バックアップ・復元機能のテスト
const backup = await window.CommentFilter2Instance.storage.createFullBackup()
await window.CommentFilter2Instance.storage.restoreFromBackup(backup.backup)

// 🆕 マイグレーション履歴の確認
await window.CommentFilter2Instance.storage.getMigrationHistory()
```

### 主要なイベント
- `CommentFilter2Ready` - 初期化完了
- `commentFilter2DataUpdated` - データ更新
- `commentFilter2SmidChanged` - 動画切替

## 🆕 **最新の追加機能**

### データベース永続化昇格機能
- **完全性チェック**: データベースの構造・データの整合性を自動検証
- **自動修復**: 破損したデータやルールを自動修復・削除
- **バックアップ・復元**: 完全なデータベースバックアップの作成と復元
- **パフォーマンス最適化**: 重複データ削除とデータベースの最適化

### 自動マイグレーション機能の強化
- **履歴記録**: 全てのマイグレーション操作の詳細履歴を記録
- **段階的マイグレーション**: 大規模な変更を安全に段階的に実行
- **データ検証**: マイグレーション前後のデータ検証機能
- **ロールバック対応**: マイグレーション失敗時の安全な処理

これらの機能により、データの安全性と信頼性が大幅に向上し、長期的な運用において安定したフィルター機能を提供します！

この文書を参考に、効率的にcomment-filter2プロジェクトを編集できます！ 