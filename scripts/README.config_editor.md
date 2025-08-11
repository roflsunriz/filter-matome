# ConfigEditor

## 概要
ConfigEditorは、プロパティファイル形式の設定ファイルを簡単に編集・管理するためのPythonプログラムなのじゃ。
複数の文字コード（UTF-8、Shift-JIS、CP932、EUC-JP）に対応しており、設定ファイルを安全に編集できるのじゃ。

## 主な機能
- 設定ファイルの読み込みと保存
- 設定の追加・編集・削除
- デフォルト設定の管理
- コメントの保持
- 文字コードの自動判定

## 使用方法
カレントディレクトリをconfig_editor.pyがあるディレクトリに移動してほしいのじゃ。
例 cd C:/NicoCache_nl
カレントディレクトリを移動した後は、プログラムを起動するのじゃ。
python config_editor.py
もしくは設定→既定のアプリ→.pyファイルにPythonを関連付ける
その後 .pyをダブルクリック

1. プログラムを起動すると、以下のメニューが表示されるのじゃ：
   - 1: 利用可能な設定を表示
   - 2: 設定を追加
   - 3: 設定を編集
   - 4: 設定を削除
   - 5: 現在の設定を表示
   - 0: 終了

2. defaultsフォルダに.propertiesファイルを配置することで、デフォルト設定として使用できるのじゃ。

## 設定ファイルの形式
properties
コメント
設定キー=設定値

## 注意事項
- 文字コード判定用の行（# NicoCache_nl 設定ファイル...）は削除しないでほしいのじゃ
- defaultsフォルダが必要なのじゃ
- 設定ファイルは自動的にバックアップされないので、重要な変更前はバックアップを取ることをお勧めするのじゃ

## 必要な環境
- Python 3.6以上

## ライセンス
This is free and unencumbered software released into the public domain.
For more information, please refer to <http://unlicense.org>

## 不具合報告
5ch のNicoCache_nlスレッドにて報告をお願いするのじゃ。
[NicoCache掲示板](https://ff5ch.syoboi.jp/?q=NicoCache)