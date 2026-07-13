# create-claude-link.ps1

## 概要

`create-claude-link.ps1` は、リポジトリ直下の `AGENTS.md` を指す相対シンボリックリンク `CLAUDE.md` を作成します。ファイル名は引数で変更できます。

## 必要環境

- Windows
- PowerShell
- シンボリックリンクを作成できる権限またはWindows開発者モード

## 使い方

```powershell
# AGENTS.md -> CLAUDE.md
.\scripts\create-claude-link.ps1

# ファイル名を指定
.\scripts\create-claude-link.ps1 -TargetFileName COMMON-AGENTS.md -LinkName CLAUDE.md

# 既存パスを置換
.\scripts\create-claude-link.ps1 -Force
```

## オプション

- `-TargetFileName`: リポジトリ直下にあるリンク元ファイル。既定値は `AGENTS.md`
- `-LinkName`: リポジトリ直下に作るリンク名。既定値は `CLAUDE.md`
- `-Force`: 既存のリンクまたはファイルを削除して作り直す

## 注意事項

- リンク元ファイルが存在しない場合はエラーになります。
- `-Force` は既存の通常ファイルやディレクトリも削除対象にするため、指定前に `LinkName` と内容を必ず確認してください。
- すでに正しいシンボリックリンクが存在する場合は変更せず正常終了します。
