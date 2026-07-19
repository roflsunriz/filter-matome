# 公式コメント投稿API調査

調査日: 2026-07-19

対象: `https://www.nicovideo.jp/watch/sm9` が参照した `nvpc_next` の公開JavaScript。認証Cookieを使わず、公開HTMLからmanifest、watchルート、依存バンドルを辿った。

## 隔離した主なバンドル

- `_web.watch._id._-main-C60pYU73.js`: 視聴ページの投稿フォームから投稿アクションを呼び出す。
- `PlayerCurrentTime-CzuUEouz.js`: 本文、コマンド、現在の再生位置を投稿アクションへ渡す。
- `PlayerSeekBar-DhFwmJ0e.js`: 投稿先選択、184処理、投稿キー取得、nvCommentへの送信、エラー時のロールバックを実装する。
- `enum-CPg2KYH3.js`: `nvapi` の投稿キー取得パスを定義する。
- `dist-DNB7MY1L.js`: `nvapi` のベースURL、credentials、フロントエンドヘッダーを設定する。

ファイル名のハッシュは公式デプロイで変わる。上記の実ファイルは `official-watch-bundle/` に隔離し、Git管理・ビルド対象にはしない。

## 確認できた通常コメント投稿フロー

1. `apiData.comment.threads` から `isDefaultPostTarget === true` のスレッドを選ぶ。
2. 通常動画ではコマンドへ `184` がなければ追加する。`isThreadkeyRequired === true` のチャンネル・コミュニティ系スレッドでは `184` を拒否する。
3. `GET https://nvapi.nicovideo.jp/v1/comment/keys/post?threadId=<id>&pc=1` で `postKey` を取得する。
4. `POST <apiData.comment.nvComment.server>/v1/threads/<id>/comments?pc=1` へ次のJSONを送る。

```json
{
  "videoId": "sm9",
  "commands": ["184"],
  "body": "コメント本文",
  "vposMs": 12345,
  "postKey": "<POST_KEY>"
}
```

両APIで `X-Frontend-Id: 6`、`X-Frontend-Version: 0`、`X-Client-Os-Type: others` を使う。投稿キー取得はニコニコのログインCookieを利用するため `credentials: include`、nvCommentへの投稿はキーを本文で渡すため `credentials: omit` である。

## 実装へ反映した制約

- 本文は公式フォームと同じ75文字まで。
- `postKey` は投稿ごとに取得し、`EXPIRED_TOKEN` のときだけ1回再取得して再試行する。
- 投稿先は `https` かつ `nvcomment.nicovideo.jp` 配下だけを許可する。
- `UNAUTHORIZED`、投稿禁止、レート制限を利用者向けメッセージへ変換する。
- 投稿キー応答がCAPTCHAを要求した場合、CAPTCHAウィジェットを複製せず、公式視聴ページで認証してから再試行するよう案内する。
- 実投稿を自動テストでは行わず、fetchモックでURL、credentials、ヘッダー、本文、184処理を検証する。

## 確認できたコマンドパレットUI

- パレットは幅316pxで、「サイズ」「位置」「カラー」を縦に並べる。
- サイズは `big`、`medium`、`small`、位置は `ue`、`naka`、`shita` のラジオ式選択である。
- 通常色は `white`、`red`、`pink`、`orange`、`yellow`、`green`、`cyan`、`blue`、`purple`、`black` の10色である。
- premiumユーザーには `white2`、`red2`、`pink2`、`orange2`、`yellow2`、`green2`、`cyan2`、`blue2`、`purple2`、`black2` の10色も追加する。
- 選択時は既存コマンドを分類し、サイズ、位置、色、その他の順に再構成する。このクローンでは自由入力のその他コマンドを持たないため、サイズ、位置、色だけを同じ順序で自動生成する。
