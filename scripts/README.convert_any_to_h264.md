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
This is free and unencumbered software released into the public domain.
For more information, please refer to <http://unlicense.org>

## 不具合報告
5chのNicoCache_nlスレッドで報告してください！
[NicoCache掲示板](https://ff5ch.syoboi.jp/?q=NicoCache)