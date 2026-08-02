# mp4-auto-rename-from-ext-thumb.py

## 概要
ニコニコ動画のキャッシュファイル（`.mp4`）を、動画ID、解像度、音声ビットレート、タイトルを含むファイル名に一括リネームするツールです。

## 主な機能
- 現行Watch APIを優先し、旧ext-thumb XMLへフォールバックして動画タイトルを取得
- ffprobeを使用して動画の解像度と音声ビットレートを取得
- マルチプロセス/マルチスレッドによる高速な処理
- キャッシュ機能によるファイルスキャンの効率化
- 安全なファイル名変換（Windowsで使用できない文字を自動変換）
- 一括リネーム前の確認機能

## 必要環境
- Python 3.7以上
- ffmpeg（ffprobeコマンドが必要）
- requests（自動インストール可能）

## 使い方

### 基本的な使い方
スクリプトをNicoCache_nlのフォルダなどに配置し、コマンドラインで実行します。
引数を指定しない場合、スクリプトを実行した場所にある `cache` フォルダを検索対象とします。

```bash
python mp4-auto-rename-from-ext-thumb.py
```

### 主なオプション

-   **パスの指定**: 処理したいファイルやディレクトリのパスを直接指定できます。複数指定も可能です。

    ```bash
    # 特定のディレクトリを処理
    python mp4-auto-rename-from-ext-thumb.py "C:/NicoCache_nl/cache"

    # 複数のファイルやディレクトリを一度に処理
    python mp4-auto-rename-from-ext-thumb.py "C:/videos/sm123.mp4" "D:/downloads"
    ```

-   **再帰検索 (`-r` or `--recursive`)**: ディレクトリ内を再帰的に検索します。

    ```bash
    python mp4-auto-rename-from-ext-thumb.py -r "C:/NicoCache_nl/cache"
    ```

-   **確認のスキップ (`-y` or `--yes`)**: リネーム前の確認プロンプトを省略し、自動でリネームを実行します。

    ```bash
    python mp4-auto-rename-from-ext-thumb.py -y "C:/NicoCache_nl/cache"
    ```

-   **ドライラン (`--dry-run`)**: 実際にはリネームを行わず、どのような変更が行われるかを確認できます。

    ```bash
    # 変更内容のプレビュー
    python mp4-auto-rename-from-ext-thumb.py --dry-run "C:/NicoCache_nl/cache"
    ```

## 変換後のファイル名形式：
sm12345678[720p,192]タイトル.mp4


## 注意事項
- 既に正しい形式のファイル名は処理をスキップします
- インターネット接続が必要です


## トラブルシューティング
1. `requests`モジュールがない場合
   - プログラム実行時に自動インストールの確認が表示されるので、y を選択してください。
   - もしくは手動で `pip install requests` を実行してください。

2. ffprobeが見つからない場合
   - FFmpegをインストールし、実行ファイルへのPATHが通っていることを確認してください。

3. 「情報取得失敗」と表示される場合
   - インターネット接続を確認してください
   - 対象の動画が削除または非公開になっている可能性があります。

## ライセンス
本ソフトウェアはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。

## 不具合報告
不具合や改善要望は、GitHub Issuesまでお願いします。 
報告の際は、OS、Pythonのバージョン、エラーログ、再現手順などを記載いただくと助かります。
