# nlFilters 編集ルールガイド

## 📋 基本原則

**⚠️ 重要**: 編集対象は **100_*.txt - 199_*.html** のファイルのみです！

- `01_globalFilter.txt` から `99_*.txt` までのファイルは外部配布物のため、**絶対に編集してはなりません**
- これらは更新時に上書きされる可能性があります
- カスタマイズは必ず 100番台以降のファイルで行います

## 🎯 編集対象ファイル一覧

### メイン機能ファイル (100-105)

| ファイル名 | 機能 | 説明 |
|-----------|------|------|
| `100_common.txt` | 共通ライブラリ | トースト通知、ロギング、共通ヘッダなどの基盤機能 |
| `101_disable_official_function.txt` | 公式機能無効化 | 公式プレイヤーの制限機能を無効化 |
| `102_mlink_video_controller.txt` | マルチリンクコントローラー | カスタムマイリスト、サムネイル非表示設定など |
| `103_comment_filter2.txt` | コメントフィルター | 強力なNGワード機能を提供 |
| `104_video_player.txt` | ビデオプレイヤー | 有料動画のキャッシュ利用機能 |
| `105_premium_hide.txt` | プレミアム勧誘非表示 | プレミアム会員勧誘要素を非表示 |

### ドキュメントファイル (198-199)

| ファイル名 | 用途 |
|-----------|------|
| `198_release_notes.html/.md` | リリースノート |
| `199_readme.html` | リードミー |

## 📖 nlFilter 基本文法

nlFilter は NicoCache_nl で解釈される特殊なフィルター言語です。

### 基本タグ

```
[Replace]  # HTML/テキストの置換
[Script]   # JavaScript コードの挿入
[Style]    # CSS スタイルの追加
[RequestHeader] # リクエストヘッダーの操作
```

### 設定項目

```
Name = フィルターの名前
URL = 対象URL（正規表現）
FullURL = 完全URL指定（正規表現）
ContentType = 対象コンテンツタイプ
Multi = TRUE/FALSE（複数マッチ）
EachLine = TRUE/FALSE（行ごと処理）
```

### 基本的な置換例

```
[Replace]
Name = サンプル置換
URL = www\.nicovideo\.jp/watch/
Match<
置換したいテキスト
>
Replace<
置換後のテキスト
>
```

### スクリプト挿入例

```
[Script]
Name = サンプルスクリプト
URL = www\.nicovideo\.jp/
Append<
console.log("Hello, NicoCache_nl!");
>
```

### スタイル追加例

```
[Style]
Name = サンプルスタイル
URL = www\.nicovideo\.jp/
Append<
.sample-class {
    color: red !important;
}
>
```

## 🔧 各ファイルの詳細説明

### 100_common.txt
- **役割**: 全体の基盤となる共通ライブラリ
- **内容**: `common.es.js` を読み込み
- **重要性**: 他の機能の前提条件
- **編集時の注意**: このファイルを無効にすると他の機能が動作しなくなります

### 101_disable_official_function.txt
- **役割**: 公式プレイヤーの制限機能を回避
- **対象**: 非プレミアム会員の制限解除
- **リスク**: 公式プレイヤーが動作しなくなる可能性あり
- **注意**: 導入・除去時はハード再読み込み（Ctrl+F5）が必要です

### 102_mlink_video_controller.txt
- **役割**: カスタムマイリスト機能の提供
- **依存**: `common.es.js` が必要
- **機能**: 設定画面、メディア情報表示、リンク機能

### 103_comment_filter2.txt
- **役割**: 高度なNGワード機能
- **対象**: 視聴ページ限定
- **依存**: `common.es.js` が必要
- **特徴**: 公式NGワード機能より遥かに強力です

### 104_video_player.txt
- **役割**: 有料動画のキャッシュ再生
- **機能**: 視聴期限切れ動画の再生、削除済み動画検知
- **依存**: `common.es.js` が必要
- **重要**: `isNeedPayment` ステート書き換えが必須です

### 105_premium_hide.txt
- **役割**: プレミアム勧誘要素の非表示
- **対象**: コモンヘッダーの勧誘要素
- **実装**: CSS による `display:none`

## ⚠️ 編集時の注意事項

### 1. 依存関係の確認
- `common.es.js` が必要な機能は 100_common.txt より後に配置
- ファイル名の数字順で読み込まれます

### 2. URL パターンの注意
- 正規表現を使用するため、特殊文字は適切にエスケープ
- `\.` でドットをエスケープします

### 3. テスト環境での確認
- 変更前にバックアップを取る
- 段階的に機能を有効化してテスト

## 🔄 編集ワークフロー

1. **バックアップ作成**
   ```bash
   # 編集前に必ずバックアップを取ります
   cp target_file.txt target_file.txt.backup
   ```

2. **編集実行**
   - 必要な機能を追加・修正

3. **動作確認**
   - ブラウザでハード再読み込み（Ctrl+F5）
   - 対象ページで動作確認

4. **問題があった場合**
   - バックアップから復元
   - 段階的に変更を適用

## 📚 参考資料

- **公式Wiki**: [nlFilterの文法](https://w.atwiki.jp/nicocachenlwiki/pages/17.html)
- **設定ファイル**: `.vscode/settings.json` で非表示ファイルを確認可能

## 🎓 実践例

### 新しい機能を追加する場合

```
# 106_custom_feature.txt として新規作成
[Replace]
Name = カスタム機能
FullURL = https://www\.nicovideo\.jp/watch/.*
Match<
(?=</head>)
>
Replace<
<script type="module" src="/local/features/dist/custom-feature.es.js"></script>
</head>
>
```

### 既存機能を無効化する場合

```
# ファイル名を変更（例：105_premium_hide.txt.disabled）
# または内容をコメントアウト
```

---

**覚えておくこと**: nlFilter は強力ですが、間違った使い方をするとサイトが正常に動作しなくなる可能性があります。必ずバックアップを取って、慎重に編集してください！ 