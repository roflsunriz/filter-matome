# NicoCache ビルドスクリプト

## 概要
NicoCacheのビルドを自動化するPowerShellスクリプトです。
- `auto-build.ps1`: メインプログラムのビルド
- `auto-build-extensions.ps1`: 拡張機能のビルド

## 主な機能
### auto-build.ps1
- Antを使用したビルド自動化
- 分かりやすい緑背景の実行画面
- jarファイルの自動生成

### auto-build-extensions.ps1
- 拡張機能の一括コンパイル
- `nlMovieFetcher.java` のコンパイルを対話的に選択可能
- コンパイルエラーの視覚的表示
- 成功したファイルの一覧表示

## 必要環境
- Windows
- PowerShell 5.1以上
- Java Development Kit (JDK)
- Apache Ant
- 環境変数`JAVA_HOME`の設定

## 使い方
### メインプログラムのビルド
1. `auto-build.ps1` を右クリックして「PowerShellで実行」を選択します。
2. ビルドが完了するまで待機します。
3. 完了後、任意のキーを押してウィンドウを閉じます。

   ```powershell
   # 直接実行する場合
   .\auto-build.ps1
   ```

### 拡張機能のビルド
1. `auto-build-extensions.ps1` を右クリックして「PowerShellで実行」を選択します。
2. `nlMovieFetcher.java` をコンパイルするかどうか尋ねられるので、`y` または `n` を入力します。
3. コンパイル結果を確認します。
4. 完了後、任意のキーを押してウィンドウを閉じます。

   ```powershell
   .\auto-build-extensions.ps1
   ```

## 注意事項
- 警告（黄色表示）は基本的に無視して問題ありません
- エラー（赤色表示）は必ず解決が必要です
- コンパイル前にソースコードのバックアップを推奨します

## トラブルシューティング
1. **コンパイルエラーが発生する場合**
   - JDKが正しくインストールされているか、環境変数 `JAVA_HOME` が正しく設定されているか確認してください。
   - ソースコードに文法エラーがないか確認してください。
   - Javaファイルの文字エンコードが `Shift-JIS` であるか確認してください。
2. **Antビルドが失敗する場合**
   - Apache Antが正しくインストールされているか、環境変数 `ANT_HOME` と `PATH` が設定されているか確認してください。
   - リポジトリルートに `build.xml` が存在するか確認してください。


## ライセンス
本ソフトウェアはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。

## 不具合報告
不具合や改善要望は、GitHub Issuesまでお願いします。
報告の際は、以下の情報を含めていただくとスムーズです。
- OS環境 (例: Windows 11)
- Java / Ant のバージョン
- エラーメッセージやコンソールのログ
- 再現手順