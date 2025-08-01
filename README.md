# filter-matome

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/release/roflsunriz/filter-matome.svg)](https://github.com/roflsunriz/filter-matome/releases)
[![Latest Version](https://img.shields.io/badge/latest-%23188-blue)](https://github.com/roflsunriz/filter-matome/releases/latest)

**filter-matome**は、ニコニコ動画の視聴体験を大幅に向上させる高機能な拡張機能群です。視聴履歴の無制限保存、強力なコメントフィルター、マイリスト2、動画プレイヤー拡張など、多彩な機能を提供します。

## ✨ 主な機能

### 🎯 コア機能
- **視聴履歴**: ブラウザ容量の許す限り無制限で履歴を保存・統計表示、シリーズ追跡、検索・フィルタ
- **マイリスト2**: 複数マイリスト作成、検索、ソート、一括操作、検索ワード保存
- **コメントフィルター2**: 公式NGワードを遥かに凌ぐ強力なフィルタリング機能、NGユーザー・ニコる数設定、コメントコマンド設定、フィルターログ送信
- **動画プレイヤー拡張**: 有料動画キャッシュ再生、削除済み動画検知・再生、HLS対応、同期機能
- **マルチリンクビデオコントローラー**: 再生速度調整、フレーム単位シーク、音量微調整、コメントヒートマップ、モジュール管理

### 🛠️ 拡張機能
- **背景画像設定**: 視聴ページの背景をカスタマイズ
- **プレミアム勧誘非表示**: 煩わしい勧誘要素を完全除去
- **公式機能無効化**: 制限された機能を解放
- **コメントヒートマップ**: 盛り上がり箇所を視覚化

## 📦 導入方法

### 前提条件
- [NicoCache_nl](https://w.atwiki.jp/nicocachenlwiki/) 本体のインストール
- Java Development Kit (JDK) 17以上
- 対応ブラウザ: Firefox (推奨), Chrome

### インストール手順

1. **NicoCache_nl本体の導入**
   ```bash
   # 最新版をダウンロードして展開
   ```

2. **フィルター群の配置**
   ```bash
   # ディレクトリ構造を維持して以下に配置
   NicoCache_nl/
   ├── nlFilters/     # 100-199番台のフィルターファイル
   ├── local/         # 拡張機能のソースコード・設定
   └── extensions/    # 追加拡張機能
   ```

3. **設定の有効化**
   - NicoCache_nlを起動
   - フィルター設定で必要な機能を有効化
   - ブラウザでハード再読み込み（Ctrl+F5）

### クリーンインストール
```bash
# 既存の100-199番台フィルターを削除
# 新しいファイルで上書き更新
# 設定のインポート（必要に応じて）
```

## 📖 機能詳細

### 視聴履歴 (watch-history)
- **無制限履歴保存**: ニコニコ動画の50件制限を突破
- **高度な統計**: 日次・週次・月次分析
- **シリーズ追跡**: 新規投稿の自動通知
- **検索・フィルタ**: 強力な検索・ソート機能

### マイリスト2 (mylist2)
- **複数マイリスト**: 無制限でマイリスト作成
- **高度な管理**: 検索、ソート、一括操作
- **インポート/エクスポート**: データの移行・バックアップ
- **API連携**: 自動情報取得・更新
- **一括移動・コピー・削除・更新**: 一括操作
- **検索ワード保存**: 検索ワードの保存

### コメントフィルター2 (comment-filter2)
- **JSON Lines形式**: 高度なルール設定
- **正規表現対応**: 柔軟なパターンマッチング
- **リアルタイム処理**: 高速なコメント処理
- **NGユーザー・ニコる数設定**: コメントのNGユーザー・ニコる数設定
- **コメントコマンド設定**: コメントコマンドの設定
- **フィルターログ送信**: フィルターログの送信

### 動画プレイヤー拡張 (video-player)
- **期限切れ動画再生**: キャッシュを活用した視聴継続
- **削除済み動画対応**: 失われた動画の復活
- **HLS対応**: 多様な動画形式をサポート
- **同期機能**: コメントと動画の完全同期
- **NGワード・NG正規表現**: コメントのNGワード・NG正規表現

### マルチリンクビデオコントローラー (mlink-video-controller)
- **リンク管理**: 複数リンクの一括管理
- **リンク切り替え**: リンクの切り替え
- **再生速度調整**: 再生速度の調整
- **フレーム単位シーク**: フレーム単位でのシーク
- **音量微調整**: 音量の微調整
- **コメントヒートマップ**: コメントの盛り上がり箇所を視覚化
- **モジュール管理**: モジュールの管理


## 🔧 開発者向け情報

### 技術スタック
- **言語**: TypeScript 5.x
- **ビルドツール**: Vite 5.x
- **ストレージ**: IndexedDB
- **UI**: Material Design Icons
- **フィルター言語**: nlFilter (独自DSL)

### プロジェクト構成
```
local/
├── features/          # メイン機能群
│   ├── src/          # TypeScriptソースコード
│   ├── dist/         # ビルド済みファイル
│   └── config/       # Vite設定ファイル群
├── nl-media-info/    # メディア情報機能
└── src/              # list.jsソースコード

nlFilters/
├── 100_common.txt           # 共通ライブラリ
├── 101_disable_official.txt # 公式機能無効化
├── 102_mlink_video_controller.txt # マルチリンクビデオコントローラー
├── 103_comment_filter2.txt  # コメントフィルター
├── 104_video_player.txt     # 動画プレイヤー
├── 105_premium_hide.txt     # プレミアム勧誘非表示
├── 106_watch_history.txt    # 視聴履歴
├── 198_release_notes.*      # リリースノート
└── 199_readme.html          # 詳細ドキュメント
```

### ビルド方法
```bash
cd local/features
npm install
npm run build
```

### nlFilter文法
```ini
[Replace]
Name = フィルター名
URL = 対象URL正規表現
Match<
置換対象テキスト
>
Replace<
置換後テキスト
>

[Script]
Name = スクリプト名
URL = 対象URL正規表現
Append<
挿入するJavaScriptコード
>

[Style]
Name = スタイル名
URL = 対象URL正規表現
Append<
追加するCSSコード
>
```

## 📚 ドキュメント

- **詳細機能説明**: [nlFilters/199_readme.html](nlFilters/199_readme.html)
- **リリースノート**: [nlFilters/198_release_notes.md](nlFilters/198_release_notes.md)
- **編集ガイド**: [nlFilters/nlFilters_編集ガイド.md](nlFilters/nlFilters_編集ガイド.md)
- **機能別ドキュメント**:
  - [Comment Filter2 説明](https://www.nicovideo.jp/local/features/dist/src/docs/comment-filter2/index.html)
  - [Mylist2 説明](https://www.nicovideo.jp/local/features/dist/src/docs/mylist2/index.html)
  - [視聴履歴](https://www.nicovideo.jp/local/features/dist/src/watch-history/index.html)

## ⚠️ 重要な注意事項

### 使用上の注意
- **全機能同時使用前提**: 個別機能の抜き出しは動作保証外
- **データバックアップ**: ブラウザデータ削除前に必ずエクスポート実行
- **更新時の確認**: リリースノートを必ず確認してから更新
- **ハード再読み込み**: 機能の有効/無効切り替え後はCtrl+F5実行

### データ削除リスク
以下の操作でIndexedDBの設定が消去されます：
- サイトデータの削除
- Cookieとサイトデータの削除
- オフライン作業用データの削除

**対策**: 各機能の設定画面から定期的にエクスポートを実行してください。

## 🔗 関連リンク

### コミュニティ
- [NicoCache_nl Wiki](https://w.atwiki.jp/nicocachenlwiki/)
- [5ちゃんねる 本スレッド](https://find.5ch.net/search?q=NicoCache)
- [おーぷん2ちゃんねる](https://ana.open2ch.net/test/read.cgi/software/1675001508/)
- [開発スレッド](https://sportschan.org/librejp/thread/16592.html)

### 開発ツール
- [Apache Ant](https://ant.apache.org/bindownload.cgi)
- [Adoptium OpenJDK](https://adoptium.net/temurin/releases/?version=17)
- [WinMerge](https://winmerge.org/?lang=ja)
- [MediaInfo](https://mediaarea.net/en/MediaInfo/Download/Windows)

## 📄 ライセンス

MIT License - Copyright (c) 2017-2025 ◆awd5z.AlOFJq

私の名前を明記している限り、本ソフトウェアは自由に使用、複製、改変、配布できます。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 🚀 リリース情報

### 最新バージョン

- **リリース形式**: `#189`, `#190` などの番号形式
- **リリース履歴**: [nlFilters/198_release_notes.md](nlFilters/198_release_notes.md)

### リリース作成方法（開発者向け）
```bash
# 次のバージョンタグを作成してプッシュ
git tag "#189"
git push origin "#189"
```

## 🤝 コントリビューション

プルリクエストや課題報告を歓迎します。大きな変更を行う前に、まずissueを作成して議論することをお勧めします。

## 🙏 謝辞

このプロジェクトは多くのコミュニティメンバーの協力により成り立っています。特に、フィードバックやバグレポートを提供してくださった全ての方々に感謝いたします。

---

**⚡ 高速・高機能・高カスタマイズ性 - filter-matomeでニコニコ動画を最大限に活用しましょう！**