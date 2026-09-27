# Zensical 文書ビルド

リポジトリ直下で `python -m pip install -r requirements-docs.txt` を実行してから、`python scripts/build-docs.py` で厳格ビルドします。出力先は `.mkdocs-build/site/` です。

`DOCS_BUILD_DATE` が設定されている場合、元の Markdown を変更せず、各ページ先頭に `最終更新日` を表示します。未設定のローカルビルドでは追加しません。GitHub Pages のワークフローは日本時間のデプロイ日時を設定します。

プレビューには `zensical serve` を使います。公開前には上記スクリプトで更新日付きの成果物を確認してください。

公開後に問題が出た場合は移行コミットを revert し、Docs ワークフローを再実行します。
