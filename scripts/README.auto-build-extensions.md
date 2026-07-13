# auto-build-extensions.ps1

## 概要

`auto-build-extensions.ps1` は、リポジトリの `extensions` にあるJavaソースをNicoCache_nl拡張として一括コンパイルするPowerShellスクリプトです。

## 必要環境

- Windows PowerShellまたはPowerShell
- JDKと環境変数 `JAVA_HOME`
- リポジトリ直下の `NicoCache_nl.jar`
- NicoCache_nl本体と互換性のあるJavaバージョン

## 処理内容

1. `extensions` へ移動する
2. `sample` を名前に含まないすべての `.java` を列挙する
3. `nlMovieFetcher.java` がある場合にコンパイルするか確認する
4. `NicoCache_nl.jar` をクラスパスへ指定して `javac` を実行する
5. 警告・エラーと成功したソース一覧を表示する

## 使い方

```powershell
.\scripts\auto-build-extensions.ps1
```

実行後、続行キーを押すまでコンソールを閉じません。

## 注意事項

- `.class` は各Javaソースと同じ `extensions` フォルダへ出力されます。
- Javaのターゲットバージョンを固定するオプションは指定していません。使用中のJDKがNicoCache_nlの実行環境と互換性を持つか確認してください。
- コンパイル警告が表示されてもクラス生成に成功する場合がありますが、エラーは修正が必要です。
- NicoCache_nl本体のビルドについては `README.auto-build.md` を参照してください。
