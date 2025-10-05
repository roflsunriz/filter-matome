サーバーAPIエンドポイント（視聴ページ）：https://www.nicovideo.jp/watch/${SMID}
ここにアクセスし、metaタグのserver-responseのcontentにJSONがあり、それを取得する。そのJSONの中のdata.responseがapiData。
ただし、生のJSONではなくHTMLエンコードとUNICODEエンコードされているので、それをデコードする。

metaタグのserver-contextとserver-responseは公式スクリプトが視聴ページレンダリング後自動消去してしまうのでfetchやxmlHttpRequestで視聴ページにアクセスして取得する必要がある。DOMから取得する方法では取れない。

# 1) 最小構造(TypeScript型)

```ts
/** ルート */
export interface NicoWatchApi {
  channel?: Channel;          // チャンネル情報
  client?: Client;            // 視聴セッション識別
  comment?: CommentBlock;     // コメント関連（スレ/レイヤ/NG/補助）
  genre?: Genre;              // ジャンル
  media?: Media | null;       // 配信方式
  owner?: Owner | null;       // 投稿者/運営（chのときnullもあり）
  payment?: Payment;          // PPV/課金可否
  pcWatchPage?: PcWatchPage;  // PC視聴ページ用フラグ群
  player?: Player;            // プレイヤー設定
  ppv?: Ppv;                  // PPVアクセス状況
  series?: Series;            // シリーズ情報（前後回リンク等）
  smartphone?: unknown | null;
  system?: { serverTime: string; /* ISO8601 */ [k: string]: unknown };
  tag?: TagBlock;             // タグ
  video?: Video;              // 視聴対象動画メタ
  videoAds?: VideoAds;        // 広告
  videoLive?: unknown | null; // 生放送系（今回null）
  viewer?: Viewer;            // 視聴者（自分）情報
  waku?: Waku;                // 枠バナー等
}

/** チャンネル */
export interface Channel {
  id: string;                 // "ch########"
  name: string;
  isOfficialAnime?: boolean;
  isDisplayAdBanner?: boolean;
  thumbnail?: { url: string; smallUrl?: string };
  viewer?: {
    follow?: {
      isFollowed: boolean;
      isBookmarked: boolean;
      token?: string;         // CSRF的トークン。公開時は伏せる
      tokenTimestamp?: number;
    };
  };
}

/** セッション */
export interface Client {
  nicosid: string;            // Cookie系ID（伏せ推奨）
  watchId: string;            // "so########"
  watchTrackId?: string;      // トラッキングID（伏せ推奨）
}

/** コメントブロック */
export interface CommentBlock {
  server?: { url?: string };  // nvComment利用時は別URLに
  keys?: { userKey?: string };
  layers: CommentLayer[];     // 描画レイヤ
  threads: CommentThread[];   // スレッド一覧（fork差分あり）
  ng?: {
    ngScore?: { isDisabled: boolean };
    channel?: unknown[];
    owner?: unknown[];
    viewer?: { revision: number; count: number; items: unknown[] };
  };
  isAttentionRequired?: boolean;
  nvComment?: {
    threadKey: string;        // JWT。公開時は伏せる
    server: string;           // e.g. "https://public.nvcomment.nicovideo.jp"
    params: {
      targets: { id: string; fork: 'owner'|'main'|'easy' }[];
      language?: string;      // "ja-jp"
    };
  };
  assist?: {
    sectionDurationSec: number;
    minMatchCharacters: number;
    ignorePostElapsedTimeSec: number;
    ignoreCommentNgScoreThreshold: number;
    commentCountThresholdList: [number, number][];
    buttonDisplayDurationSec: number;
    buttonDisplayOffsetSec: number;
  };
}
export interface CommentLayer {
  index: number;
  isTranslucent: boolean;
  threadIds: { id: number; fork: 0|1|2; forkLabel: 'main'|'owner'|'easy' }[];
}
export interface CommentThread {
  id: number;                 // 注意：同一idでforkだけ違う行が来る
  fork: 0|1|2;
  forkLabel: 'main'|'owner'|'easy'|'community'|'default';
  videoId: string;            // "so########"
  isActive: boolean;
  isDefaultPostTarget: boolean;
  isEasyCommentPostTarget: boolean;
  isLeafRequired: boolean;
  isOwnerThread: boolean;
  isThreadkeyRequired: boolean;
  threadkey?: string | null;  // 必須時のみ付与
  is184Forced: boolean;
  hasNicoscript: boolean;
  label: string;
  postkeyStatus: number;
  server?: string;
}

/** ジャンル */
export interface Genre {
  key: string;    // "anime" など
  label: string;
  isImmoral: boolean;
  isDisabled: boolean;
  isNotSet: boolean;
}

/** メディア/配信 */
export interface Media {
  domand?: unknown | null;
  delivery?: unknown | null;
  deliveryLegacy?: unknown | null;
}

/** 課金 */
export interface Payment {
  video: {
    isPpv: boolean;
    isAdmission: boolean;
    isContinuationBenefit: boolean;
    isPremium: boolean;
    watchableUserType: 'purchaser'|'member'|'all'|string;
    commentableUserType: 'purchaser'|'member'|'all'|string;
    billingType: 'custom'|string;
  };
  preview?: {
    ppv?: { isEnabled: boolean };
    admission?: { isEnabled: boolean };
    continuationBenefit?: { isEnabled: boolean };
    premium?: { isEnabled: boolean };
  };
}

/** ページ用フラグ */
export interface PcWatchPage {
  showOwnerMenu?: boolean;
  showOwnerThreadCoEditingLink?: boolean;
  showMymemoryEditingLink?: boolean;
  channelGtmContainerId?: string; // GTM。公開時は伏せ可
  tagRelatedBanner?: unknown | null;
  videoEnd?: { bannerIn?: unknown; overlay?: unknown } | null;
}

/** プレイヤー */
export interface Player {
  initialPlayback?: unknown | null;
  comment?: { isDefaultInvisible: boolean };
  layerMode?: number;
}

/** PPV */
export interface Ppv {
  accessFrom?: string | null;
}

/** シリーズ（前後回リンク含む） */
export interface Series {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  video?: {
    prev?: SeriesItem;
    next?: SeriesItem;
    first?: SeriesItem;
  };
}
export interface SeriesItem {
  type: 'essential';
  id: string;                  // "so########"
  title: string;
  registeredAt: string;        // ISO8601
  count: { view: number; comment: number; mylist: number; like: number };
  thumbnail: {
    url: string;
    middleUrl?: string;
    largeUrl?: string;
    listingUrl?: string;
    nHdUrl?: string;
  };
  duration: number;            // 秒
  shortDescription?: string;
  latestCommentSummary?: string;
  isChannelVideo: boolean;
  isPaymentRequired: boolean;
  playbackPosition?: number | null;
  owner: { ownerType: 'channel'|'user'; type: string; id: string; name: string; iconUrl?: string };
  requireSensitiveMasking?: boolean;
  videoLive?: unknown | null;
  isMuted?: boolean;
}

/** タグ */
export interface TagBlock {
  items: TagItem[];
  hasR18Tag: boolean;
  isPublishedNicoscript: boolean;
  edit: { isEditable: boolean; uneditableReason?: string | null; editKey?: string | null };
  viewer: { isEditable: boolean; uneditableReason?: string | null; editKey?: string | null };
}
export interface TagItem {
  name: string;
  isCategory: boolean;
  isCategoryCandidate: boolean;
  isNicodicArticleExists: boolean;
  isLocked: boolean;
}

/** 動画 */
export interface Video {
  id: string;                  // "so########"
  title: string;
  description: string;         // HTML含む
  count: { view: number; comment: number; mylist: number; like: number };
  duration: number;            // 秒
  thumbnail: {
    url: string;
    middleUrl?: string;
    largeUrl?: string;
    player?: string;
    ogp?: string;
  };
  rating?: { isAdult: boolean };
  registeredAt: string;        // ISO8601
  isPrivate: boolean;
  isDeleted: boolean;
  isNoBanner: boolean;
  isAuthenticationRequired: boolean;
  isEmbedPlayerAllowed: boolean;
  isGiftAllowed: boolean;
  viewer?: { isOwner: boolean; like?: { isLiked: boolean; count?: number | null } };
  watchableUserTypeForPayment?: string;
  commentableUserTypeForPayment?: string;
  hasLyrics?: boolean;
}

/** 広告 */
export interface VideoAds {
  items: unknown[];
  reason?: string | null;
  additionalParams?: {
    videoId: string;
    videoDuration: number;
    isAdultRatingNG: boolean;
    isAuthenticationRequired: boolean;
    isR18: boolean;
    nicosid?: string;          // 伏せ推奨
    lang?: string;
    watchTrackId?: string;     // 伏せ推奨
    channelId?: string;
    genre?: string;
    gender?: string | number;
    age?: number;
  };
}

/** 視聴者 */
export interface Viewer {
  id?: number;
  nickname?: string;
  isPremium?: boolean;
  allowSensitiveContents?: boolean;
  existence?: { age?: number; prefecture?: string; sex?: string };
}

/** レイアウト/バナー */
export interface Waku {
  information?: unknown | null;
  bgImages?: unknown[];
  addContents?: unknown | null;
  addVideo?: unknown | null;
  tagRelatedBanner?: {
    title: string;
    imageUrl: string;
    description?: string;
    isEvent: boolean;
    linkUrl: string;
    linkType: 'link' | string;
    linkOrigin?: string;
    isNewWindow: boolean;
  } | null;
  tagRelatedMarquee?: unknown | null;
  pcWatchHeaderCustomBanner?: unknown | null;
}
```

---

# 2) 最小JSONサンプル（値はプレースホルダ）

```json
{
  "channel": {
    "id": "chXXXXXXXX",
    "name": "お兄ちゃんはおしまい！",
    "isOfficialAnime": true,
    "thumbnail": { "url": "https://.../ch.png" },
    "viewer": {
      "follow": {
        "isFollowed": false,
        "isBookmarked": false,
        "token": "<REDACTED>",
        "tokenTimestamp": 0
      }
    }
  },
  "client": {
    "nicosid": "<REDACTED>",
    "watchId": "soXXXXXXXX",
    "watchTrackId": "<REDACTED>"
  },
  "comment": {
    "layers": [
      { "index": 0, "isTranslucent": false, "threadIds": [{ "id": 1111111111, "fork": 1, "forkLabel": "owner" }] },
      { "index": 1, "isTranslucent": false, "threadIds": [{ "id": 2222222222, "fork": 0, "forkLabel": "main" }, { "id": 2222222222, "fork": 2, "forkLabel": "easy" }] }
    ],
    "threads": [
      { "id": 1111111111, "fork": 1, "forkLabel": "owner", "videoId": "soXXXXXXXX", "isActive": false, "isDefaultPostTarget": false, "isEasyCommentPostTarget": false, "isLeafRequired": false, "isOwnerThread": true, "isThreadkeyRequired": false, "threadkey": null, "is184Forced": false, "hasNicoscript": true, "label": "owner", "postkeyStatus": 0 },
      { "id": 1111111111, "fork": 0, "forkLabel": "main", "videoId": "soXXXXXXXX", "isActive": true, "isDefaultPostTarget": false, "isEasyCommentPostTarget": false, "isLeafRequired": true, "isOwnerThread": false, "isThreadkeyRequired": false, "threadkey": null, "is184Forced": false, "hasNicoscript": false, "label": "default", "postkeyStatus": 0 },
      { "id": 2222222222, "fork": 0, "forkLabel": "main", "videoId": "soXXXXXXXX", "isActive": true, "isDefaultPostTarget": true, "isEasyCommentPostTarget": false, "isLeafRequired": true, "isOwnerThread": false, "isThreadkeyRequired": true, "threadkey": "<REDACTED>", "is184Forced": true, "hasNicoscript": false, "label": "community", "postkeyStatus": 0 }
    ],
    "nvComment": {
      "threadKey": "<REDACTED.JWT>",
      "server": "https://public.nvcomment.nicovideo.jp",
      "params": { "targets": [{ "id": "1111111111", "fork": "owner" }, { "id": "2222222222", "fork": "main" }], "language": "ja-jp" }
    }
  },
  "genre": { "key": "anime", "label": "アニメ", "isImmoral": false, "isDisabled": false, "isNotSet": false },
  "payment": {
    "video": { "isPpv": true, "isAdmission": false, "isContinuationBenefit": false, "isPremium": false, "watchableUserType": "purchaser", "commentableUserType": "purchaser", "billingType": "custom" },
    "preview": { "ppv": { "isEnabled": true } }
  },
  "player": { "comment": { "isDefaultInvisible": false }, "layerMode": 0 },
  "series": {
    "id": 377762,
    "title": "お兄ちゃんはおしまい！",
    "video": {
      "prev": { "type": "essential", "id": "soAAAAAAA", "title": "＃01 ...", "registeredAt": "2023-01-09T01:00:00+09:00", "count": { "view": 0, "comment": 0, "mylist": 0, "like": 0 }, "thumbnail": { "url": "https://.../thumb.jpg" }, "duration": 1419, "isChannelVideo": true, "isPaymentRequired": false, "owner": { "ownerType": "channel", "type": "channel", "id": "chXXXXXXXX", "name": "お兄ちゃんはおしまい！" } },
      "next": { "type": "essential", "id": "soBBBBBBB", "title": "＃03 ...", "registeredAt": "2023-01-23T01:00:00+09:00", "count": { "view": 0, "comment": 0, "mylist": 0, "like": 0 }, "thumbnail": { "url": "https://.../thumb.jpg" }, "duration": 1420, "isChannelVideo": true, "isPaymentRequired": true, "owner": { "ownerType": "channel", "type": "channel", "id": "chXXXXXXXX", "name": "お兄ちゃんはおしまい！" } }
    }
  },
  "tag": {
    "items": [
      { "name": "アニメ", "isCategory": false, "isCategoryCandidate": false, "isNicodicArticleExists": true, "isLocked": true },
      { "name": "お兄ちゃんはおしまい！", "isCategory": false, "isCategoryCandidate": false, "isNicodicArticleExists": true, "isLocked": true }
    ],
    "hasR18Tag": false,
    "isPublishedNicoscript": false,
    "edit": { "isEditable": false, "uneditableReason": "USER_FORBIDDEN", "editKey": null },
    "viewer": { "isEditable": false, "uneditableReason": "USER_FORBIDDEN", "editKey": null }
  },
  "video": {
    "id": "soXXXXXXXX",
    "title": "＃02 ...",
    "description": "<p>HTML可</p>",
    "count": { "view": 0, "comment": 0, "mylist": 0, "like": 0 },
    "duration": 1420,
    "thumbnail": { "url": "https://.../thumb.jpg" },
    "rating": { "isAdult": false },
    "registeredAt": "2023-01-16T01:00:00+09:00",
    "isPrivate": false,
    "isDeleted": false,
    "isNoBanner": false,
    "isAuthenticationRequired": true,
    "isEmbedPlayerAllowed": true,
    "isGiftAllowed": false,
    "viewer": { "isOwner": false, "like": { "isLiked": false, "count": null } }
  },
  "videoAds": {
    "items": [],
    "additionalParams": {
      "videoId": "soXXXXXXXX",
      "videoDuration": 1420,
      "isAdultRatingNG": false,
      "isAuthenticationRequired": true,
      "isR18": false,
      "nicosid": "<REDACTED>",
      "lang": "ja-jp",
      "watchTrackId": "<REDACTED>",
      "channelId": "chXXXXXXXX",
      "genre": "anime",
      "gender": "1",
      "age": 12
    }
  },
  "viewer": {
    "id": 0,
    "nickname": "viewer",
    "isPremium": false,
    "allowSensitiveContents": true,
    "existence": { "age": 0, "prefecture": "Other", "sex": "male" }
  },
  "system": { "serverTime": "2025-09-19T15:28:54+09:00" }
}
```

---

# 3) 運用メモ（罠/正規化/利用指針）

* IDの重複とfork

  * `comment.threads` は **同一 `id` で `fork` が異なる行**が並ぶ（`owner/main/easy`）。キーにする際は `(id, fork)` の複合キーにする。

* 秘匿値

  * `client.nicosid`, `client.watchTrackId`, `channel.viewer.follow.token`, `comment.nvComment.threadKey`, `comment.threads[].threadkey` は **公開ログ/解析共有では必ず `<REDACTED>` に**。

* ISO日時

  * `registeredAt`, `system.serverTime` はISO8601。TZ付き（`+09:00`）なので、DB格納時はUTC変換 or 文字列保持を明示。

* PPV境界

  * 視聴/コメント可否は `payment.video.*` と `video.isAuthenticationRequired`、さらに `series.video.*.isPaymentRequired` を併読。

* コメント描画

  * 実系統のコメント取得は `nvComment.server` ＋ `threadKey` と `params.targets[]` を使う。古い `comment.server.url` は空のことがある（nvComment優先）。

* タグ編集可否

  * `tag.edit.viewer.isEditable=false` のときはUIから編集不可。理由文字列は `USER_FORBIDDEN` 等。

* 仕様安定度

  * `9d091f87`/`acf68865` などの謎フラグが混入することがある。**将来互換のために unknown として素通し**が無難。

* HTML混在

  * `video.description` はタグを含む。表示時は **サニタイズ必須**。
