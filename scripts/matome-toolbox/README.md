# matome-toolbox

実装・ビルドの詳細は [`../README.matome-toolbox.md`](../README.matome-toolbox.md) を参照してください。

このプロジェクトは、GUIを表示しないヘッドレス実行を最初から同じサービス層で扱います。プラグインの追加点は `ToolPlugin` SPI、表示ヘルプはプラグイン内のREADMEです。mediaのrenameはffprobeを優先し、情報不足や利用不能時はGPACへフォールバックして、実測した解像度と音声ビットレートからNicoCache互換名を組み立てます。H.264変換はHigh profile・8-bit 4:2:0のFastStart MP4へ統一し、adaptiveは同じ互換条件を満たすH.264だけをコピーします。

テストは `mvn test`、パッケージを含む検証は `mvn verify` で実行します。E2Eは一時ディレクトリ内でmatome-toolboxを子プロセス起動し、偽の外部コマンドとlocalhost APIだけで全組み込み機能を検証するため、実機の設定を変更しません。
