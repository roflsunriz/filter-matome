# MP4 FastStart 変換ツール (convert-to-faststart.ps1)

## 概要
このツールは、MP4ファイルの `moov` アトムをファイルの先頭に移動させ、ストリーミング再生に最適化（FastStart化）するためのPowerShellスクリプトです。

## 主な機能
- 指定したフォルダ内のMP4ファイルを一括でFastStart化
- サブフォルダ内のファイルも再帰的に処理可能
- 既存のファイルを上書きするオプション
- 変換後のファイルは `元のファイル名_faststart.mp4` という名前で保存
- 処理前に実行内容を確認できるDryRunモード

## 必要な環境
- PowerShell
- FFmpeg (システムパスに設定されていること)

## 使い方
1. PowerShellを開き、`convert-to-faststart.ps1` があるディレクトリに移動します。
   ```powershell
   cd C:\filter-matome\scripts
   ```

2. スクリプトを実行します。

   **例1: カレントディレクトリのMP4ファイルを処理**
   ```powershell
   .\convert-to-faststart.ps1
   ```

   **例2: サブフォルダを含めて再帰的に処理**
   ```powershell
   .\convert-to-faststart.ps1 -Recurse
   ```

   **例3: 特定のフォルダを対象とし、既存の出力ファイルを上書き**
   ```powershell
   .\convert-to-faststart.ps1 -Path "D:\videos" -Recurse -Overwrite
   ```

   **例4: 実際には変換せず、実行されるコマンドを確認 (DryRun)**
   ```powershell
   .\convert-to-faststart.ps1 -Recurse -DryRun
   ```

## 注意事項
- このスクリプトは動画を再エンコードしません。コーデックはそのままコピーされます。
- `_faststart` という接尾辞がファイル名に付いているMP4は、既に処理済みとみなされスキップされます。
- 出力ファイルが既に存在する場合、デフォルトではスキップされます。上書きするには `-Overwrite` スイッチを使用してください。

## トラブルシューティング
1. **"ffmpeg が見つかりません" というエラーが表示される**
   - FFmpegがインストールされているか確認してください。
   - FFmpegの実行ファイルがあるフォルダにシステムの環境変数 `PATH` が通っているか確認してください。

2. **ファイルが変換されない**
   - 対象フォルダに `.mp4` ファイルが存在するか確認してください。
   - スクリプトを実行するフォルダや対象フォルダに対する書き込み権限があるか確認してください。

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