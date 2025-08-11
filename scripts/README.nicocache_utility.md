# NicoCache Utility

## 概要
NicoCache Utilityは、NicoCacheの運用・管理を支援するPythonスクリプトです。Java環境の設定、証明書の管理、プロキシ設定など、複雑な作業を簡単に実行できます。

## 主な機能
- NicoCacheの起動管理（最小化起動、GUI起動）
- Java環境の設定（JAVA_HOME、ANT_HOME）
- 証明書の管理（生成、登録、更新、削除）
- プロキシ設定（Windows、Firefox）
- 拡張機能のコンパイル支援
- タスクスケジューラーへの登録

## 必要環境
- Windows 10/11
- Python 3.7以上
- 以下のPythonパッケージ:
  - pywin32
  - psutil
  - setuptools
- Java Development Kit (JDK) 17以上
- Apache Ant

## 使い方
1. スクリプトを実行します：
- カレントディレクトリをnicocache_utility.pyがあるディレクトリに移動してください。
    例 cd C:/NicoCache_nl
- カレントディレクトリを移動した後は、プログラムを起動します。
    python nicocache_utility.py
- もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
- その後 .pyをダブルクリック

2. メニューから実行したい機能の番号を入力します
3. 画面の指示に従って操作を進めます

## 注意事項
- 一部の機能は管理者権限が必要です
- Java関連の機能を使用する場合は、事前にJDKのインストールが必要です
- 証明書の操作は慎重に行ってください
- プロキシ設定を変更する際は、既存の設定をメモしておくことを推奨します

## トラブルシューティング
### よくある問題と解決方法
1. 「管理者権限が必要です」と表示される
   - 指示に従って管理者権限を付与してください。
   - 或いはコマンドラインを管理者権限で実行してからスクリプトを実行してください。

2. Javaコマンドが認識されない
   - JAVA_HOMEが正しく設定されているか確認
   - JDKが正しくインストールされているか確認

3. 証明書の登録に失敗する
   - 管理者権限で実行しているか確認
   - 証明書ファイルが存在するか確認

## ライセンス
This is free and unencumbered software released into the public domain.
For more information, please refer to <http://unlicense.org>

## 不具合報告・要望
不具合や機能の要望は以下の掲示板にて報告をお願いします：
[NicoCache掲示板](https://ff5ch.syoboi.jp/?q=NicoCache)