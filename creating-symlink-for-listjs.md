### NicoCache_nl 用 `local/list.js` シンボリックリンク作成手順（Windows / PowerShell）

**重要**: NicoCache_nl はキャッシュデータ用スクリプトを `C:\NicoCache_nl\local\list.js` という「固定のパス・固定のファイル名」で参照させます。設定で場所や名前は変えられません。ゆえに、ビルド成果物（例: `cache-data-manager.es.js`）へ必ずこの固定パス名でシンボリックリンクを張る必要があります。.mapファイルはデバッグ用です。

---

#### 前提
- PowerShell（管理者権限）で実行します。（開発者モードが有効なら非管理者でも可）
- NicoCache_nl を一旦停止しておくと安全です。
- ビルド済みファイルの一例: `C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js`
- `C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js.map`

#### 手順
1. 既存の `list.js`（ファイル/リンク）があれば削除します。

   ```powershell
   Remove-Item -Path "C:\NicoCache_nl\local\list.js" 
   Remove-Item -Path "C:\NicoCache_nl\local\list.js.map"
   ```

2. 固定パス名 `C:\NicoCache_nl\local\list.js` に、ビルド成果物へのシンボリックリンクを作成します。

   ```powershell
   New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js"
   New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js.map" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js.map"
   ```

   - `-Path` は必ず `C:\NicoCache_nl\local\list.js`（固定）にします。
   - `-Target` はあなたの環境でのビルド成果物の実在パスに合わせて調整します。

3. 作成を確認します。

   ```powershell
   Get-Item "C:\NicoCache_nl\local\list.js" | Select-Object Mode, LinkType, Target
   Resolve-Path "C:\NicoCache_nl\local\list.js"
   Test-Path "C:\NicoCache_nl\local\list.js"
   ```

#### うまくいかない時の確認点
- 管理者権限で PowerShell を開いているか、あるいは Windows の開発者モードが有効か確認します。
- `-Target` に指定したパスが正しいか見直します。
- 既存の `list.js` が残っているか（削除できているか）確認します。

---

参考コマンド（再掲）

```powershell
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js"
New-Item -ItemType SymbolicLink -Path "C:\NicoCache_nl\local\list.js.map" -Target "C:\NicoCache_nl\local\features\dist\cache-data-manager.es.js.map"
```