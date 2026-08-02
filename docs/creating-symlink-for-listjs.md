### NicoCache_nl 用 `local/list.js` シンボリックリンク作成手順

NicoCache_nl はキャッシュデータマネージャーを `local/list.js` という固定名で参照します。Java Toolbox の開発補助プラグインは、Windows・Linux・macOS のいずれでも、ビルド成果物とNicoCache_nl側のファイルを安全にリンクできます。

!!! warning "重要"
      シンボリックリンクの作成にはOSの権限が必要です。既存の通常ファイルやフォルダーは削除されず、既存リンクの再作成には `--force`、実作成には `--yes` が必要です。最初に `--dry-run` で対象を確認してください。

## 既定パス

開発補助プラグインのGUIとCLIは、引数を省略した場合に次のパスを使います。

| OS | Source | Target |
| --- | --- | --- |
| Windows | `C:\filter-matome` | `%LOCALAPPDATA%\NicoCache_nl` |
| Linux | 現在のリポジトリ | `$XDG_CONFIG_HOME/NicoCache_nl`（未設定時は`~/.config/NicoCache_nl`） |
| macOS | 現在のリポジトリ | `~/Library/Application Support/NicoCache_nl` |

実際の環境が既定値と異なる場合は、`--source-root` と `--target-root` を明示してください。NicoCache_nlのデータルートを別に設定している場合も、Targetには実際に `local`、`nlFilters`、`extensions` が存在するルートを指定します。

## Java Toolboxで一括作成

### 1. JARの確認

```powershell
Test-Path "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar"
```

Linux/macOSでは同じJARを `java -jar` で実行してください。

### 2. 一括リンクの予定確認

`scripts`、`local`、`nlFilters`、`extensions`、`local/list.js`をまとめて確認します。存在しないSource項目はスキップされます。

```powershell
java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action links `
  --source-root "C:\filter-matome" --target-root "$env:LOCALAPPDATA\NicoCache_nl" --dry-run
```

### 3. 一括リンクの実行

```powershell
java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action links `
  --source-root "C:\filter-matome" --target-root "$env:LOCALAPPDATA\NicoCache_nl" --yes --force
```

## `list.js` だけを作成

`create-listjs-symlink.ps1` 相当の `listjs` アクションは、指定したJavaScriptと同じ場所に `.map` がある場合だけ `list.js.map` も作成します。`.map` がない場合、既存の `list.js.map` は変更しません。

```powershell
java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action listjs `
  --target "C:\filter-matome\local\features\dist\features.js" `
  --link-dir "$env:LOCALAPPDATA\NicoCache_nl\local" --dry-run

java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" `
  --headless --plugin developer --action listjs `
  --target "C:\filter-matome\local\features\dist\features.js" `
  --link-dir "$env:LOCALAPPDATA\NicoCache_nl\local" --yes --force
```

引数を省略すると、Sourceの `local/features/dist/features.js` をTargetの `local/list.js`へリンクします。

## 確認とトラブルシューティング

Windowsでは次のようにリンクの種類と解決先を確認できます。

```powershell
Get-Item "$env:LOCALAPPDATA\NicoCache_nl\local\list.js" -Force |
  Select-Object Mode, LinkType, Target
Resolve-Path "$env:LOCALAPPDATA\NicoCache_nl\local\list.js"
```

リンク作成が拒否された場合は、Windowsでは開発者モードまたはシンボリックリンク作成権限、Linux/macOSでは対象ファイルシステムの権限を確認してください。リンク先の親フォルダーは自動作成されないため、NicoCache_nlのディレクトリ構成も確認します。
