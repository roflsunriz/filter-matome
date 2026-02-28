# create-all-symlinks.ps1

## 概要
`create-all-symlinks.ps1` は、`filter-matome` 配下の必要ファイル・フォルダを `NicoCache_nl` 側へシンボリックリンクとして一括作成する PowerShell スクリプトです。  
既定では `C:\filter-matome` をリンク元、`C:\NicoCache_nl` をリンク先として動作します。

## 主な機能
- リンク定義に基づく一括作成（`scripts`、`local`、`nlFilters`、`extensions` など）
- 既存リンクの判定（同一ターゲットなら再作成せずスキップ）
- `--force` による既存シンボリックリンクの再作成
- `--dry-run` による作成予定一覧の確認
- 管理者権限が不足している場合の昇格実行（UAC）サポート

## 必要環境
- Windows 10/11
- PowerShell 7.0 以上
- リンク先ディレクトリ（既定: `C:\NicoCache_nl`）が存在していること
- 実作成時は管理者権限が必要

## 使い方
1. `scripts` フォルダでスクリプトを実行します。
2. `SourceRoot` / `TargetRoot` を引数で渡さない場合、対話的に入力できます（Enter で既定値）。
3. 実作成前に `--dry-run` で差分確認することを推奨します。

```powershell
# 既定パスで実行（必要に応じて対話入力）
.\create-all-symlinks.ps1

# 作成内容の確認のみ（実際には作成しない）
.\create-all-symlinks.ps1 --dry-run

# カスタムパスを指定して dry-run
.\create-all-symlinks.ps1 --source-root D:\filter-matome --target-root D:\NicoCache_nl --dry-run

# 既存シンボリックリンクを再作成
.\create-all-symlinks.ps1 --force
```

### 主なオプション
- `-SourceRoot`, `--source-root`: リンク元ルートパス
- `-TargetRoot`, `--target-root`: リンク先ルートパス
- `-DryRun`, `--dry-run`: 作成予定のみ表示
- `-Force`, `--force`: 既存シンボリックリンクを再作成

## 注意事項
- シンボリックリンクでない既存ファイル/フォルダがリンク先にある場合は、安全のためスキップされます。
- リンク先の親ディレクトリが不足している場合、通常実行ではエラー終了します（`--dry-run` は警告表示で継続）。
- 実作成時に管理者権限がない場合は、昇格再実行の確認が表示されます。

## トラブルシューティング
1. **リンク作成に失敗する**
   - PowerShell を管理者権限で起動して再実行してください。
   - `NicoCache_nl` のフォルダ構成が想定どおりか確認してください。

2. **リンク元が存在しないと表示される**
   - `--source-root` の指定が正しいか確認してください。
   - `filter-matome` 側でビルド成果物が未生成の可能性があるため、必要なビルドを先に実行してください。

3. **既存ファイルがあり作成されない**
   - 安全のため自動上書きされません。内容を確認してから手動で退避・削除し、再実行してください。
