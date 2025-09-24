# NicoCache ビルドスクリプト

## 概要
NicoCacheのビルドを自動化するPowerShellスクリプト群です。
- `auto-build.ps1`: メインプログラムのビルド
- `auto-build-extensions.ps1`: 拡張機能のビルド

## 主な機能
### auto-build.ps1
- Antを使用したビルド自動化
- 分かりやすい緑背景の実行画面
- jarファイルの自動生成

### auto-build-extensions.ps1
- 拡張機能の一括コンパイル
- nlMovieFetcher.javaの選択的コンパイル
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
1. `auto-build.ps1`を右クリックしてPowerShellで実行を選ぶ
2. ビルド完了まで待機
3. 完了後、任意のキーを押して終了

### 拡張機能のビルド
1. `auto-build-extensions.ps1`を右クリックしてPowerShellで実行を選ぶ
2. nlMovieFetcher.javaのコンパイルを選択（y/n）
3. コンパイル結果を確認
4. 完了後、任意のキーを押して終了

## 注意事項
- 警告（黄色表示）は基本的に無視して問題ありません
- エラー（赤色表示）は必ず解決が必要です
- コンパイル前にソースコードのバックアップを推奨します

## トラブルシューティング
1. コンパイルエラーが発生する場合
   - JDKが正しくインストールされているか確認
   - `JAVA_HOME`が正しく設定されているか確認
   - ソースコードに文法エラーがないか確認
   - javaファイルの文字エンコードがShift-JISであるか確認

2. Antビルドが失敗する場合
   - Antが正しくインストールされているか確認
   - build.xmlが存在するか確認

## ライセンス
This software is released under the MIT License.
For more information, please refer to <https://opensource.org/licenses/MIT>

## 不具合報告
filter-matomeのGitHubのIssueにて報告をお願いします。
[filter-matome](https://github.com/roflsunriz/filter-matome/issues)

Issueに含めるべき情報について
*OS環境 (例：Windows 10/11, macOS 10.15, Linux Ubuntu 20.04)
*NicoCache_nlのバージョン (例：2025-08-26)
*Pythonのバージョン (例：3.7.0)
*Javaのバージョン (例：17.0.11)
*PowerShellのバージョン (例：7.3.5)
*filter-matomeのバージョン (例：#193.2)
*コンソールログ
*エラーログ
*実行コマンド