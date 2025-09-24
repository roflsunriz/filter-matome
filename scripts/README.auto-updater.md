# NicoCache Auto Updater

## 概要
NicoCacheの自動更新ツールです。本体とフィルタの更新を自動的にチェックして、新しいバージョンがあれば更新してくれます！

## 主な機能
- NicoCache本体の自動更新
- フィルタまとめの自動更新
- フィルタまとめのGitHubリリースページをブラウザですぐに開けるショートカット
- カスタム更新設定（最大5つまで）
- 更新間隔の柔軟な設定
- 自動再起動機能

## 必要な環境
- Python 3.7以上
- Java（NicoCacheの実行に必要）

## 必要なパッケージ
以下のパッケージは自動でインストールされます：
- requests
- beautifulsoup4
- schedule
- py7zr
- psutil

## 使い方
1. プログラムを起動する
カレントディレクトリをconfig_editor.pyがあるディレクトリに移動してください。
例 cd C:/NicoCache_nl
カレントディレクトリを移動した後は、プログラムを起動してください。
python auto-updater.py
pythonw auto-updater.py (ウィンドウモードで起動)
もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
その後 .pyをダブルクリック

2. 更新対象を選択する
   - 本体更新：NicoCache本体を更新
   - フィルタまとめ：フィルタファイルを更新
   - カスタム1-5：独自の更新設定

3. 保存先を設定する
   - デフォルト：C:/NicoCache_nl
   - 「参照」ボタンで変更可能

4. 更新間隔を設定する
   - プリセット：12時間、1日、2日、3日、1週間
   - カスタム：任意の分単位で設定

5. 「開始」ボタンで監視開始
6. フィルタまとめの最新情報を確認したくなったら、ウィンドウ下部の「フィルタまとめ」ボタンを押すとブラウザでGitHubのリリースページが開きます

## 注意事項
- 本体更新時は自動的にNicoCacheを再起動します
- 更新中はJavaプロセスが一時的に停止されます
- 設定は自動的にconfig.jsonに保存されます

## トラブルシューティング
1. 更新に失敗する場合
   - インターネット接続を確認してください
   - 保存先のフォルダに書き込み権限があるか確認してください

2. 再起動に失敗する場合
   - Javaがインストールされているか確認してください
   - パスが正しく設定されているか確認してください

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
