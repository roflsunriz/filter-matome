# `local/features/src/docs` について

このフォルダは、以前は `comment-filter2` / `mylist2` の説明ページ（HTML + TypeScript + CSS）をビルドして配信するために使われていました。

現在は、ドキュメントを **ルートの `docs/` 配下に Markdown として集約**しています。

## 現状の方針

- ユーザー向けドキュメント: ルートの `docs/` を編集してください
- `local/features` のビルド: 旧docsページはBunビルドの対象外です

## 関連リンク

- `docs/comment-filter2.md`
- `docs/mylist2.md`
