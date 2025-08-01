# nl-media-info プロジェクト アーキテクチャ & 編集ガイド

## 📁 プロジェクト構成

```
nl-media-info/
├── src/
│   ├── index.ts                       # メインエントリーポイント (1.9KB)
│   ├── index.html                     # HTMLテンプレート (2.6KB)
│   ├── types/
│   │   └── media-info.ts              # 型定義 (3.0KB)
│   ├── utils/
│   │   ├── constants.ts               # 定数定義 (832B)
│   │   ├── formatters.ts              # フォーマッター関数 (1.1KB)
│   │   └── validators.ts              # バリデーション関数 (3.7KB)
│   ├── parsers/
│   │   ├── media-info-parser.ts       # メディア情報パーサー (4.5KB)
│   │   └── nico-video-media-info.ts   # ニコ動メディア情報クラス (4.5KB)
│   ├── managers/
│   │   └── statistics-manager.ts      # 統計情報管理 (5.0KB)
│   ├── ui/
│   │   └── ui-updater.ts              # UI更新処理 (6.3KB)
│   ├── styles/
│   │   └── styles.ts                  # スタイル定義 (5.1KB)
│   └── images/
│       └── favicon.ts                 # ファビコン (371B)
├── config/
│   └── vite.config.ts                 # Viteビルド設定 (1.0KB)
├── dist/                              # ビルド成果物
│   ├── index.html                     # コンパイル済みHTML
│   └── main.js                        # バンドル済みJS
├── package.json                       # プロジェクト設定
├── tsconfig.json                      # TypeScript設定
└── README.md                          # このファイル
```

## 🏗️ アーキテクチャ概要

### データフロー
```
ニコニコ動画API (mediainfo)
    ↓ (fetch)
MediaInfoParser ─── JSONデータ解析・構造化
    ↓
NicoVideoMediaInfo ─── ファイル分類・詳細抽出
    ↓
StatisticsManager ─── 統計情報生成
    ↓
UIUpdater ─── DOM更新・表示
```

### 初期化フロー
```
index.ts ─── アプリケーション初期化
    ↓
Constants ─── 設定値・URL生成
    ↓
API取得 ─── メディア情報JSON取得
    ↓
Parser処理 ─── データ解析・正規化
    ↓
UI更新 ─── 概要・詳細・統計表示
```

### UI更新フロー
```
UIUpdater.updateAll()
    ├── updateBasicInfo() ─── 基本情報表示
    ├── updateDetailedInfo() ─── 詳細ストリーム情報
    └── updateStatistics() ─── フォーマット別統計
```

## 📋 各ファイルの役割詳細

### 🎯 **コア機能**

#### `index.ts` - メインエントリーポイント
- **役割**: アプリケーション全体の初期化・実行制御
- **機能**: スタイル・ファビコン読み込み、API呼び出し、エラーハンドリング
- **編集タイミング**: 初期化フロー変更、グローバルエラーハンドリング追加

#### `parsers/media-info-parser.ts` - メディア情報パーサー
- **役割**: APIレスポンスの解析・構造化処理
- **機能**: 動画・音声トラック抽出、ビットレート計算、一般情報設定
- **編集タイミング**: 新しいメディア形式対応、解析ロジック改善

#### `parsers/nico-video-media-info.ts` - ニコ動メディア情報クラス
- **役割**: ニコニコ動画特有のファイル処理・分類
- **機能**: init.cmfv/cmfa識別、ファイルサイズ計算、作成日時取得
- **編集タイミング**: 新しいファイル形式対応、ニコ動仕様変更対応

### 📊 **データ・統計管理**

#### `managers/statistics-manager.ts` - 統計情報管理
- **役割**: メディアファイルの統計情報生成・集計
- **機能**: フォーマット別分類、サイズ統計、HTML生成
- **編集タイミング**: 新しい統計指標追加、集計ロジック改善

#### `utils/formatters.ts` - フォーマッター関数
- **役割**: データの表示形式変換
- **機能**: ファイルサイズ単位変換、数値フォーマット
- **編集タイミング**: 新しい表示形式追加、単位変換ロジック変更

#### `utils/validators.ts` - バリデーション関数
- **役割**: データの妥当性検証・エラー検出
- **機能**: メディア情報検証、ファイルサイズ検証、トラック情報検証
- **編集タイミング**: 新しい検証ルール追加、データ品質向上

### 🎨 **UI・表示**

#### `ui/ui-updater.ts` - UI更新処理 (最大ファイル)
- **役割**: DOM要素の更新・表示制御
- **機能**: 基本情報表示、詳細情報表示、統計情報表示、タイトル更新
- **編集タイミング**: 新しい表示項目追加、レイアウト変更

#### `styles/styles.ts` - スタイル定義
- **役割**: アプリケーションのCSS・デザイン
- **機能**: グリッドレイアウト、ダークモード対応、レスポンシブデザイン
- **編集タイミング**: デザイン変更、新しいUIコンポーネント追加

#### `index.html` - HTMLテンプレート
- **役割**: アプリケーションのHTML構造定義
- **機能**: メディア概要、詳細情報、統計情報の表示領域
- **編集タイミング**: 新しい表示セクション追加、HTML構造変更

### 🛠️ **設定・ユーティリティ**

#### `utils/constants.ts` - 定数定義
- **役割**: アプリケーション全体で使用する定数管理
- **機能**: API URL、ファイル名パターン、デバッグフラグ
- **編集タイミング**: 新しい定数追加、API仕様変更対応

#### `types/media-info.ts` - 型定義
- **役割**: TypeScript型定義の統合管理
- **機能**: MediaItem、TrackInfo、統計情報等の型定義
- **編集タイミング**: 新しいデータ構造追加、型安全性向上

#### `images/favicon.ts` - ファビコン
- **役割**: アプリケーションのファビコン定義
- **機能**: SVGアイコンの文字列データ
- **編集タイミング**: ファビコンデザイン変更

## 🎯 目的別編集ガイド

### 💡 **新しいメディア情報を表示したい**
1. `types/media-info.ts` - 新しいフィールドの型定義追加
2. `parsers/media-info-parser.ts` - 解析ロジック追加
3. `ui/ui-updater.ts` - 表示処理追加
4. `index.html` - 表示要素追加
5. `styles/styles.ts` - スタイル追加

### 📊 **統計情報を拡張したい**
- **メイン対象**: `managers/statistics-manager.ts`
- **補助対象**: `utils/formatters.ts` (新しいフォーマット関数)
- **UI更新**: `ui/ui-updater.ts` (統計表示処理)

### 🎨 **UIデザインを変更したい**
1. `styles/styles.ts` - CSS変更・追加
2. `index.html` - HTML構造変更
3. `ui/ui-updater.ts` - DOM操作調整
4. `images/favicon.ts` - ファビコン変更

### 🌐 **API仕様変更に対応したい**
1. `utils/constants.ts` - エンドポイントURL更新
2. `parsers/media-info-parser.ts` - 解析ロジック更新
3. `types/media-info.ts` - レスポンス型更新
4. `utils/validators.ts` - バリデーション更新

### 🔧 **新しいファイル形式を対応したい**
1. `utils/constants.ts` - 新しいファイル名パターン追加
2. `parsers/nico-video-media-info.ts` - ファイル識別ロジック追加
3. `managers/statistics-manager.ts` - 統計分類ロジック更新

### 🚀 **パフォーマンスを改善したい**
- **データ処理**: `parsers/media-info-parser.ts` (解析最適化)
- **DOM操作**: `ui/ui-updater.ts` (バッチ更新)
- **統計計算**: `managers/statistics-manager.ts` (計算効率化)

### 🔍 **デバッグ機能を強化したい**
1. `utils/constants.ts` - デバッグフラグ追加
2. `utils/validators.ts` - 検証強化
3. `index.ts` - ログ出力追加

## ⚠️ 重要な注意点

### 🔥 **必ず確認すべきファイル**
- **型変更時**: `types/media-info.ts` (全ファイルに影響)
- **API変更時**: `utils/constants.ts` (エンドポイント・定数に影響)
- **UI変更時**: `index.html` (表示構造に影響)

### 🚨 **変更時の影響範囲**
- `types/media-info.ts` 変更 → 全TypeScriptファイルに影響
- `utils/constants.ts` 変更 → 解析・取得処理全体に影響
- `parsers/media-info-parser.ts` 変更 → UI表示全体に影響
- `index.html` 変更 → UI・スタイル全体に影響

### 📝 **コーディング規約**
- TypeScript strictモード対応必須
- 非同期処理は async/await を使用
- エラーハンドリングは try-catch で適切に処理
- DOM操作前に要素存在確認必須

### 🎛️ **ビルド・開発環境**
- **開発サーバー**: `npm run dev` (Vite HMR対応)
- **本番ビルド**: `npm run build` → `dist/` フォルダ
- **型チェック**: `npm run type-check`
- **プレビュー**: `npm run preview`

## 🔍 デバッグ・テスト

### グローバル変数アクセス
```javascript
// ニコニコ動画データ確認
console.log(window.opener.NicoCache_nl.watch.apiData.video);

// デバッグモード確認
window.opener.NicoCache_nl.watch.apiData.video.id; // 動画ID
window.opener.NicoCache_nl.watch.apiData.video.title; // 動画タイトル
```

### よく使用するデバッグコマンド
```javascript
// API URL確認
console.log("https://www.nicovideo.jp/cache/mediainfo?" + 
           window.opener.NicoCache_nl.watch.apiData.video.id);

// DOM要素確認
document.querySelector('#nlMediaInfo');     // メインコンテナ
document.querySelector('#results');        // 結果表示エリア
document.querySelector('#loading');        // ローディング表示
```

### 主要なDOM要素
- `#nlMediaInfo` - メインアプリケーションコンテナ
- `#results` - メディア情報表示エリア
- `#loading` - ローディング表示
- `#error` - エラー表示
- `.summary-grid` - 概要情報グリッド

### パフォーマンス監視ポイント
- **API応答時間**: fetch処理からparse完了まで
- **DOM更新時間**: UIUpdater各メソッドの実行時間
- **統計計算時間**: StatisticsManager処理時間
- **メモリ使用量**: 大量メディアファイル処理時

## 🚀 開発Tips

### 効率的な開発フロー
1. **型定義から開始** - `types/media-info.ts`で新機能の型を定義
2. **定数追加** - `utils/constants.ts`で必要な定数を追加
3. **解析処理実装** - `parsers/`で新しいデータ処理を実装
4. **UI表示実装** - `ui/ui-updater.ts`で表示処理を追加
5. **統合テスト** - `index.ts`で全体動作確認

### よくある問題と解決法
- **型エラー** → `types/media-info.ts`の型定義更新
- **API取得失敗** → `utils/constants.ts`のURL確認
- **表示崩れ** → `styles/styles.ts`のCSS確認
- **統計計算エラー** → `utils/validators.ts`でデータ検証強化

### ニコニコ動画特有の注意点
- **window.opener依存** - 親ウィンドウからのデータ取得必須
- **ファイル命名規則** - init01.cmfv/cmfa, init1.cmfv/cmfa, 001.cmfv/cmfa対応
- **メディア形式** - HLS (m3u8) + fMP4 (cmfv/cmfa) 構成

この文書を参考に、効率的にnl-media-infoプロジェクトを編集できるのじゃ！ 