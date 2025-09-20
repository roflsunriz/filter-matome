#動画変換ツール (convert_any_to_h264.py)

## 概要
このツールは、様々な形式の動画ファイルをH.264、HEVC (H.265)、AV1形式に変換できる便利なGUIアプリケーションです！

## 主な機能
- ドラッグ＆ドロップでの簡単なファイル追加
- 複数ファイルの一括変換
- HLSフォルダの変換対応
- 3種類のコーデック選択
- - AVC (H.264) - 互換性重視
- - HEVC (H.265) - 圧縮効率重視
- - AV1 - 最新の圧縮技術
- リアルタイムの変換進捗表示
- 詳細なログ表示

## 必要要件
- Python 3.x
- FFmpeg（システムパスに設定されていること）
-  必要なPythonパッケージ:
  pip install tkinterdnd2

## 使い方
1. プログラムを起動する
- カレントディレクトリをconfig_editor.pyがあるディレクトリに移動してください。
    例 cd C:/NicoCache_nl
- カレントディレクトリを移動した後は、プログラムを起動してください。
    python autoUpdater.py
    pythonw autoUpdater.py (ウィンドウモードで起動)
- もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
- その後 .pyをダブルクリック
2. 以下のいずれかの方法でファイルを追加:
- 「動画ファイルを追加」ボタンでファイル選択
- 「HLSフォルダを追加」ボタンでフォルダ選択
- ウィンドウに直接ファイルをドラッグ＆ドロップ
- 変換したいコーデックを選択
4. 「変換開始」ボタンをクリック

## 注意事項
- 初回起動時、TkinterDnD2が自動でインストールされます
- FFmpegがインストールされていない場合は動作しないので注意してください
- 変換したファイルは実行フォルダに保存されます

## エラー対応
もしエラーが発生したら、ログ表示欄を確認してください。主な対処方法は：
1. FFmpegが正しくインストールされているか確認
2. 入力ファイルが破損していないか確認
3. 十分なディスク容量があるか確認

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