### NicoCache_nl 用 `local/list.js` シンボリックリンク作成手順（Windows / PowerShell）

!!! warning "重要"
      NicoCache_nl はキャッシュデータマネージャースクリプトを `C:\NicoCache_nl\local\list.js` という「固定のパス・固定のファイル名」で参照する。設定で場所や名前は変更不能。  
      そのため、ビルド成果物（`C:\NicoCache_nl\local\features\dist\features.js`）へ必ずこの固定パス名でシンボリックリンクを張る必要がある。`.map`ファイルはソースからビルドしたときに生成されるデバッグ用ファイル。リリースには含まれていない。

---

#### 前提
PowerShell（管理者権限）で実行する。（Windows + R -> 「wt」または「wt.exe」と入力 -> Ctrl + Shift + Enter -> UAC「はい」）

安全のため、NicoCache_nl を停止させておく。

```powershell
Set-Location "C:\filter-matome"
.\stop-nicocache.ps1
```

`stop-nicocache.ps1`は`-jar ...\NicoCache_nl.jar`の指紋があるPIDだけを対象にし、正常終了できない場合に限って確認後に強制終了する。`Stop-Process -Name java -Force`のような名前指定は、NicoCache_nl以外のJavaプロセスも終了するため使用しない。

- ビルド済みファイルの一例: `C:\NicoCache_nl\local\features\dist\features.js`
- `C:\NicoCache_nl\local\features\dist\features.js.map`

---

## 1. 手動でシンボリックリンクを作成する場合

**1.** 既存の `list.js`（ファイル/リンク）があれば削除しておく。

```powershell
Remove-Item -Path "C:\NicoCache_nl\local\list.js"
Remove-Item -Path "C:\NicoCache_nl\local\list.js.map"
```

**2.** 固定パス名 `C:\NicoCache_nl\local\list.js` に、ビルド成果物へのシンボリックリンクを作成する。

```powershell
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js" -Target "C:\NicoCache_nl\local\features\dist\features.js"
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js.map" -Target "C:\NicoCache_nl\local\features\dist\features.js.map"
```

   - `-Path` は必ず `C:\NicoCache_nl\local\list.js`（固定）にする。
   - `-Target` はあなたの環境でのビルド成果物の実在パスに合わせて調整すること。

**3.** 作成を確認。

```powershell
Get-Item "C:\NicoCache_nl\local\list.js" | Select-Object Mode, LinkType, Target
Resolve-Path "C:\NicoCache_nl\local\list.js"
Test-Path "C:\NicoCache_nl\local\list.js"
```

---

## 2. Java Toolboxでまとめて作成する場合

配布アーカイブに含まれるJava Toolboxを使うと、`scripts`、`local`、`nlFilters`、`extensions`、`list.js`のリンクを一括で作成できる。`features.js.map`が存在する場合は`list.js.map`も自動でリンクし、存在しない場合はスキップする。

### 使い方

**1.** PowerShellまたはターミナルで、Java ToolboxのJARがあることを確認する。

```powershell
Test-Path "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar"
```

**2.** まずdry-runで対象を確認する。

```powershell
java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" --headless --plugin nicocache --action links --source-root "C:\filter-matome" --data-root "C:\NicoCache_nl" --dry-run
```

**3.** 内容を確認したら、`--yes --force`を付けて実行する。

```powershell
java -jar "C:\NicoCache_nl\scripts\java-toolbox\target\filter-matome-toolbox-0.1.0-SNAPSHOT.jar" --headless --plugin nicocache --action links --source-root "C:\filter-matome" --data-root "C:\NicoCache_nl" --yes --force
```

管理者権限またはシンボリックリンク作成を許可する開発者モードが必要な場合がある。Java Toolboxは通常ファイルやフォルダを削除して置き換えず、異なる既存リンクも`--force`なしではスキップする。
