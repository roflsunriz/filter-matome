# ConfigEditor

## 概要
ConfigEditorは、プロパティファイル形式の設定ファイルを簡単に編集・管理するためのPythonプログラムです。
複数の文字コード（UTF-8、Shift-JIS、CP932、EUC-JP）に対応しており、設定ファイルを安全に編集できます。

## 主な機能
- 設定ファイルの読み込みと保存
- 設定の追加・編集・削除
- デフォルト設定の管理
- コメントの保持
- 文字コードの自動判定

## 使用方法
カレントディレクトリをconfig_editor.pyがあるディレクトリに移動してください。
例 cd C:/NicoCache_nl
カレントディレクトリを移動した後は、プログラムを起動してください。
python config_editor.py
もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
その後 .pyをダブルクリック

1. プログラムを起動すると、以下のメニューが表示されます：
   - 1: 利用可能な設定を表示
   - 2: 設定を追加
   - 3: 設定を編集
   - 4: 設定を削除
   - 5: 現在の設定を表示
   - 0: 終了

2. defaultsフォルダに.propertiesファイルを配置することで、デフォルト設定として使用できます。

## 設定ファイルの形式
properties
コメント
設定キー=設定値

## 注意事項
- 文字コード判定用の行（# NicoCache_nl 設定ファイル...）は削除しないでください
- defaultsフォルダが必要です
- 設定ファイルは自動的にバックアップされないので、重要な変更前はバックアップを取ることをお勧めします

## 必要な環境
- Python 3.6以上

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