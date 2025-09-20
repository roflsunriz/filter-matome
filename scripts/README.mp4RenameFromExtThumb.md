# mp4RenameFromExtThumb.py

## 概要
ニコニコ動画のキャッシュファイル（mp4）を、動画IDと解像度、音声ビットレート、タイトルを含むファイル名に一括リネームするツールです。

## 主な機能
- ニコニコ動画の外部APIを使用して動画タイトルを取得
- ffprobeを使用して動画の解像度と音声ビットレートを取得
- マルチプロセス/マルチスレッドによる高速な処理
- キャッシュ機能によるファイルスキャンの効率化
- 安全なファイル名変換（Windowsで使用できない文字を自動変換）
- 一括リネーム前の確認機能

## 必要環境
- Python 3.6以上
- ffmpeg（ffprobeコマンドが必要）
- requests（自動インストール可能）

## 使い方
1. プログラムをダウンロードして、NicoCache_nlフォルダに配置してください。
2. カレントディレクトリをconfig_editor.pyがあるディレクトリに移動してください。
例 cd C:/NicoCache_nl
カレントディレクトリを移動した後は、プログラムを起動してください。
3. コマンドライン(bash)で以下を実行：
    python mp4RenameFromExtThumb.py
4. もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
    その後 .pyをダブルクリック

## 変換後のファイル名形式：
sm12345678[720p,192]タイトル.mp4


## 注意事項
- 既に正しい形式のファイル名は処理をスキップします
- 実行前に必ずバックアップを取ってください！
- ffmpegがインストールされていない場合は動作しないです
- インターネット接続が必要です

## トラブルシューティング
1. `requests`モジュルがない場合
   - プログラム実行時に自動インストールの確認が表示されます
   - `pip install requests`で手動インストール可能

2. ffprobeが見つからない場合
   - ffmpegをインストールしてください
   - PATHが通っているか確認してください

3. 「情報取得失敗」と表示される場合
   - インターネット接続を確認してください
   - 動画が削除されている可能性があります

## ライセンス
This software is released under the MIT License.
For more information, please refer to <https://opensource.org/licenses/MIT>

## 不具合報告
filter-matomeのGitHubのIssueにて報告をお願いします。
[filter-matome](https://github.com/roflsunriz/filter-matome/issues)

Issueに含めるべき情報について
*OS環境 (例：Windows 10/11, macOS 10.15, Linux Ubuntu 20.04)
*NicoCache_nlのバージョン (例：2025-08-26)
*Pythonのバージョン (例：3.7.0)
*Javaのバージョン (例：17.0.11)
*PowerShellのバージョン (例：7.3.5)
*filter-matomeのバージョン (例：#193.2)
*コンソールログ
*エラーログ
*実行コマンド