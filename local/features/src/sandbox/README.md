# sandbox

外部Webアプリの公開配布物を調査するときに、プロダクションコードと分離して扱うための領域です。ここで得た外部コードを `features.js` へ取り込まず、確認できたAPI契約だけを型・テスト・実装へ移します。

## 公式視聴ページのコメント投稿調査

- `download-official-watch-bundle.ps1`: 認証Cookieを渡さずに公開視聴ページと参照JavaScriptを `official-watch-bundle/` へ取得します。
- `comment-post-api.md`: 2026-07-19に取得した公式バンドルから確認したコメント投稿契約です。
- `official-watch-bundle/`: ダウンロードしたHTML・JavaScriptの隔離先です。期限付きキーやトラッキング値を含む可能性があるためGit管理外です。

```powershell
cd local/features/src/sandbox
./download-official-watch-bundle.ps1
```

実行時は次を守ってください。

- ログインCookie、ブラウザープロファイル、認証ヘッダーをスクリプトへ追加しない。
- ダウンロード物をコミット、配布、ビルド入力にしない。
- API契約を更新するときは、複数のバンドルをそのまま複製せず、URL、メソッド、必要フィールド、エラー分岐だけをこのディレクトリの調査メモへ反映する。
- 調査後に不要なら `official-watch-bundle/` を削除してよい。再取得はスクリプトで行える。
