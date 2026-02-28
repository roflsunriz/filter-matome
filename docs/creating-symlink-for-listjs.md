### NicoCache_nl 用 `local/list.js` シンボリックリンク作成手順（Windows / PowerShell）

**重要**: NicoCache_nl はキャッシュデータ用スクリプトを `C:\NicoCache_nl\local\list.js` という「固定のパス・固定のファイル名」で参照します。設定で場所や名前は変えられません。  
そのため、ビルド成果物（例: `cacheDataManager.iife.js`）へ必ずこの固定パス名でシンボリックリンクを張る必要があります。`.map`ファイルはデバッグ用です。

---

#### 前提
- PowerShell（管理者権限）で実行します。（開発者モードが有効なら非管理者でも可）
- NicoCache_nl を一旦停止しておくと安全です。
- ビルド済みファイルの一例: `C:\NicoCache_nl\local\features\dist\cacheDataManager.iife.js`
- `C:\NicoCache_nl\local\features\dist\cacheDataManager.iife.js.map`

---

## 1. 手動でシンボリックリンクを作成する場合

1. 既存の `list.js`（ファイル/リンク）があれば削除します。

   ```powershell
   Remove-Item -Path "C:\NicoCache_nl\local\list.js"
   Remove-Item -Path "C:\NicoCache_nl\local\list.js.map"
   ```

2. 固定パス名 `C:\NicoCache_nl\local\list.js` に、ビルド成果物へのシンボリックリンクを作成します。

   ```powershell
   New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js" -Target "C:\NicoCache_nl\local\features\dist\cacheDataManager.iife.js"
   New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js.map" -Target "C:\NicoCache_nl\local\features\dist\cacheDataManager.iife.js.map"
   ```

   - `-Path` は必ず `C:\NicoCache_nl\local\list.js`（固定）にします。
   - `-Target` はあなたの環境でのビルド成果物の実在パスに合わせて調整します。

3. 作成を確認します。

   ```powershell
   Get-Item "C:\NicoCache_nl\local\list.js" | Select-Object Mode, LinkType, Target
   Resolve-Path "C:\NicoCache_nl\local\list.js"
   Test-Path "C:\NicoCache_nl\local\list.js"
   ```

---

## 2. スクリプト（`scripts\create-listjs-symlink.ps1`）で簡単に作成する場合

このリポジトリには、シンボリックリンク作成を自動化する PowerShell スクリプト `scripts\create-listjs-symlink.ps1` が用意されています。  
このスクリプトを使うことで、削除やリンク作成、mapファイルの有無チェックもまとめて自動で行えます。

### 使い方

1. PowerShell でカレントディレクトリをNicoCache_nlのルートディレクトリにします。

   ```powershell
   Set-Location "C:\NicoCache_nl"
   ```

2. 以下のコマンドを実行します

   ```powershell
   .\scripts\create-listjs-symlink.ps1
   ```

対話型のスクリプトなので、Targetを訊かれたらビルド成果物のパスを入力してください。既定値で`C:\NicoCache_nl\local\features\dist\cacheDataManager.iife.js`を指定済みなのでそれで良ければEnterでOKです。

3. スクリプトが自動で `list.js` および `.map` のリンクを作成し、確認情報も表示します。