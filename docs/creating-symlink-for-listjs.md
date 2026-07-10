### NicoCache_nl 用 `local/list.js` シンボリックリンク作成手順（Windows / PowerShell）

!!! warning "重要"
      NicoCache_nl はキャッシュデータマネージャースクリプトを `C:\NicoCache_nl\local\list.js` という「固定のパス・固定のファイル名」で参照する。設定で場所や名前は変更不能。  
      そのため、ビルド成果物（`C:\NicoCache_nl\local\features\dist\features.js`）へ必ずこの固定パス名でシンボリックリンクを張る必要がある。`.map`ファイルはソースからビルドしたときに生成されるデバッグ用ファイル。リリースには含まれていない。

---

#### 前提
PowerShell（管理者権限）で実行する。（Windows + R -> 「wt」または「wt.exe」と入力 -> Ctrl + Shift + Enter -> UAC「はい」）

安全のため、NicoCache_nl を停止させておく。

```powershell
Stop-Process -Name javaw -Force
Stop-Process -Name java -Force
```

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

## 2. スクリプト（`scripts\create-listjs-symlink.ps1`）で簡単に作成する場合

このリポジトリには、シンボリックリンク作成を自動化する PowerShell スクリプト `scripts\create-listjs-symlink.ps1` を用意してある。  
このスクリプトを使うことで、削除やリンク作成、mapファイルの有無チェックもまとめて自動で行える。

### 使い方

**1.** PowerShell でカレントディレクトリをNicoCache_nlのルートディレクトリに移動する。

```powershell
Set-Location "C:\NicoCache_nl"
```

**2.** 以下のコマンドを実行する

```powershell
.\scripts\create-listjs-symlink.ps1
```

対話型のスクリプトなので、Targetを訊かれたらビルド成果物のパスを入力する。既定値で`C:\NicoCache_nl\local\features\dist\features.js`を指定済みなのでそれで良ければEnterで進める。

**3.** スクリプトが自動で `list.js` および `.map` のリンクを作成し、確認情報も表示する。
