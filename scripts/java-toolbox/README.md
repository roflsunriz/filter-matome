# filter-matome Java Toolbox

実装・ビルドの詳細は [`../README.java-toolbox.md`](../README.java-toolbox.md) を参照してください。

このプロジェクトは、GUIを表示しないヘッドレス実行を最初から同じサービス層で扱います。プラグインの追加点は `ToolPlugin` SPI、表示ヘルプはプラグイン内のREADMEです。

テストは `mvn test`、パッケージを含む検証は `mvn verify` で実行します。
