# create-listjs-symlink.ps1

## 概要

`create-listjs-symlink.ps1` は、ビルド済みJavaScriptをNicoCache_nlの `local/list.js` として読み込めるようシンボリックリンクを作成します。対象の `.map` が存在する場合は `list.js.map` もリンクします。

## 必要環境

- Windows
- PowerShell 7.0以上
- シンボリックリンクを作成できる権限またはWindows開発者モード
- リンク元となるビルド済みJavaScript

## 使い方

```powershell
# 既定の features.js を使用
.\scripts\create-listjs-symlink.ps1

# PowerShell形式の引数
.\scripts\create-listjs-symlink.ps1 -TargetFile C:\NicoCache_nl\local\features\dist\features.js -LinkDir C:\NicoCache_nl\local -Force

# GNU形式の引数
.\scripts\create-listjs-symlink.ps1 --target C:\NicoCache_nl\local\features\dist\features.js --link-dir C:\NicoCache_nl\local --force
```

## オプション

- `-TargetFile`, `--target`: リンク元のJavaScript。既定値は `C:\NicoCache_nl\local\features\dist\features.js`
- `-LinkDir`, `--link-dir`, `--linkdir`: `list.js` を作るフォルダ。既定値は `C:\NicoCache_nl\local`
- `-Force`, `--force`: 強制再作成を指定する互換オプション

## 注意事項

- 現在の実装は `-Force` の有無にかかわらず、既存の `list.js` を削除してからリンクを作成します。通常ファイルが置かれている場合も対象になるため、実行前に退避してください。
- `.map` が存在しない場合、既存の `list.js.map` は変更せず、mapリンクの作成だけをスキップします。
- 対象JavaScriptが存在しない場合はエラー終了します。
- 全ファイルをまとめてリンクする場合は `create-all-symlinks.ps1` を使用してください。
