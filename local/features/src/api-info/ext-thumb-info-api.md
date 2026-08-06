APIエンドポイント: https://ext.nicovideo.jp/api/getthumbinfo/{video_id}

## 現行クライアントの互換仕様

`ext.nicovideo.jp/api/getthumbinfo` は現在も旧XMLを返す動画がありますが、環境や動画種別によってJSON、HTTPエラー、必要項目の欠落が混在する可能性があります。実装では `common/video-info-api.ts` に取得と正規化を集約し、次の順序で取得します。

1. `https://ext.nicovideo.jp/api/getthumbinfo/{video_id}` を要求する。
2. XMLまたはJSONの動画情報を共通の `ThumbInfo` へ変換する。
3. 取得失敗・未知形式・非OKレスポンスの場合は、次の現行Watch APIを試す。

```text
GET https://www.nicovideo.jp/api/watch/v3/{video_id}?actionTrackId={10文字の英数字}_{UNIXミリ秒}
X-Frontend-Id: 6
X-Frontend-Version: 0
```

ログイン中は通常版を使用する。通常版が`UNAUTHORIZED`（HTTP 400）またはHTTP 401を返した未ログイン環境だけ、同じリクエスト条件で`/api/watch/v3_guest/{video_id}`へフォールバックする。ログイン中にゲスト版を固定使用すると`FORBIDDEN`（HTTP 400）になる環境がある。

Watch APIの成功レスポンスは `meta.status=200` と `data.video` を中心に扱います。`data.video.duration` は秒数を `m:ss` または `h:mm:ss` へ変換し、`count.view`・`count.comment`・`count.mylist`、`thumbnail.url`（なければ`player`/`ogp`）、`registeredAt`、`owner`または`channel`、`tag.items`、`genre.label` を取得します。公式チャンネル動画では `owner` が `null` で `channel` のみ存在する場合があるため、どちらも任意項目です。`isPrivate`、`isDeleted`、`meta.errorCode` は公開状態エラーとして保持します。R18系は `tag.hasR18Tag` とタグ名の両方を確認します。

必須項目を固定せず、タイトル、説明、サムネイル、投稿者、チャンネル、タグ、各カウンター、時間、ジャンルの欠落や `null` を個別に既定値へ正規化します。旧XMLの `<user_*>` と `<ch_*>`、タグの `lock="1"` も同じ `ThumbInfo` に変換します。解析用の `raw` はレスポンス構造を残しつつ、編集キー、アクセストークン、URLクエリの署名キーなどを除去・マスクします。

APIレスポンス(OK):
<nicovideo_thumb_response status="ok">
<thumb>
<video_id>sm9</video_id>
<cache>dmcCache</cache>
<title>新・豪血寺一族 -煩悩解放 - レッツゴー！陰陽師</title>
<description>レッツゴー！陰陽師（フルコーラスバージョン）</description>
<thumbnail_url>https://nicovideo.cdn.nimg.jp/thumbnails/9/9</thumbnail_url>
<first_retrieve>2007-03-06T00:33:00+09:00</first_retrieve>
<length>5:20</length>
<movie_type>mp4</movie_type>
<size_high>1</size_high>
<size_low>1</size_low>
<view_counter>22656940</view_counter>
<comment_num>5604951</comment_num>
<mylist_counter>182598</mylist_counter>
<last_res_body>徹子 88888888888888888... (　ﾟ∀ﾟ)o彡°どーま...</last_res_body>
<watch_url>https://www.nicovideo.jp/watch/sm9</watch_url>
<thumb_type>video</thumb_type>
<embeddable>1</embeddable>
<no_live_play>0</no_live_play>
<tags domain="jp">
<tag lock="1">陰陽師</tag>
<tag lock="1">レッツゴー！陰陽師</tag>
<tag lock="1">公式</tag>
<tag lock="1">音楽</tag>
<tag lock="1">ゲーム</tag>
<tag>新・豪血寺一族</tag>
<tag>弾幕動画</tag>
<tag>3月6日投稿動画</tag>
<tag>最古の動画</tag>
<tag>重要ニコニコ文化財</tag>
</tags>
<genre>未設定</genre>
<user_id>4</user_id>
<user_nickname>中の</user_nickname>
<user_icon_url>
https://secure-dcdn.cdn.nimg.jp/nicoaccount/usericon/defaults/blank.jpg
</user_icon_url>
</thumb>
</nicovideo_thumb_response>

APIレスポンス(NOT FOUND):
<nicovideo_thumb_response status="fail">
<error>
<code>NOT_FOUND</code>
<description>not found or invalid</description>
</error>
</nicovideo_thumb_response>
