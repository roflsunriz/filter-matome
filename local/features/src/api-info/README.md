# api-info

## 役割

NicoCache_nlとニコニコ動画関連APIについて、実装時に確認したエンドポイント、レスポンス構造、取得例を保存する参照資料です。TypeScriptの実行コードではなく、`features.js` にはバンドルされません。

## 文書一覧

- `cache-info-api.md`: NicoCache_nlのキャッシュ情報API。
- `ext-thumb-info-api.md`: 旧ext-thumb XMLと現行Watch API JSONを含む動画情報API。
- `nico-watch-api.md`: ウォッチページと `apiData` の取得に関するメモ。
- `nl-gpac-json.md`: NicoCache_nlのGPAC解析JSON。
- `nl-movie-fetcher-api.md`: 現行Domand/CMAF配信とnlMovieFetcherの実測仕様。
- `nv-comment-api.md`: コメントAPIの要求・応答構造。
- `nv-comment-api-snippet.md`: コメントAPIの調査用抜粋。

## 更新方針

- 実装で利用する前に、NicoCache_nl本体、公式レスポンス、既存クライアントの順に現在の仕様を照合する。
- ブラウザー側の `window.NicoCache_nl.watch` と`nicocachenl.test`のREST APIを混同しない。
- サンプルにはCookie、トークン、ユーザーID、視聴履歴などの秘密情報・個人情報を残さない。
- レスポンス全体を保存する必要がない場合は、利用するフィールドとエラー形式だけを最小化して記録する。
- 仕様変更に追従したときは、参照している実装とテストfixtureも検索して更新する。
