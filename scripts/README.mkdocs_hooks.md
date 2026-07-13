# mkdocs_hooks.py

## 概要

`mkdocs_hooks.py` は、MkDocsのビルド時に各Markdownページへ最終更新日を付加するフックです。`mkdocs.yml` の `hooks` から自動的に読み込まれます。

## 動作

- 環境変数 `DOCS_BUILD_DATE` が空の場合はMarkdownを変更しない
- 値がある場合はページ先頭へ `> 最終更新日: <値>` を追加する
- すでに同じ形式の最終更新日が先頭にある場合は重複追加しない

## 使い方

通常は直接実行せず、環境変数を設定してMkDocsをビルドします。

```powershell
$env:DOCS_BUILD_DATE = "2026-07-13"
python -m mkdocs build --strict
```

## 必要環境

- Python
- このリポジトリで使用しているMkDocs環境

## 注意事項

- 日付形式の検証や自動算出は行いません。`DOCS_BUILD_DATE` の文字列をそのまま表示します。
- このフックはビルド時のMarkdown文字列だけを変更し、元の `.md` ファイルは書き換えません。
