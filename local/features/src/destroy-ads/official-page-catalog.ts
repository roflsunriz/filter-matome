export interface OfficialPageTarget {
  readonly id: string;
  readonly url: string;
  readonly kind:
    | "home"
    | "listing"
    | "ranking"
    | "search"
    | "tag"
    | "watch"
    | "user"
    | "series"
    | "mylist"
    | "account-listing";
}

/**
 * 広告経路を観測する代表URL。認証を要求するページも、Cookieを持たない
 * BrowserContextでログイン導線まで観測し、個人識別子を採取しない。
 */
export const OFFICIAL_PAGE_TARGETS: readonly OfficialPageTarget[] = [
  { id: "home", kind: "home", url: "https://www.nicovideo.jp/" },
  {
    id: "video-top",
    kind: "home",
    url: "https://www.nicovideo.jp/video_top",
  },
  {
    id: "new-arrivals",
    kind: "listing",
    url: "https://www.nicovideo.jp/newarrival",
  },
  {
    id: "ranking",
    kind: "ranking",
    url: "https://www.nicovideo.jp/ranking/genre/all?term=24h",
  },
  {
    id: "search",
    kind: "search",
    url: "https://www.nicovideo.jp/search/%E9%9F%B3%E6%A5%BD",
  },
  {
    id: "tag",
    kind: "tag",
    url: "https://www.nicovideo.jp/tag/%E9%9F%B3%E6%A5%BD",
  },
  {
    id: "watch",
    kind: "watch",
    url: "https://www.nicovideo.jp/watch/sm9",
  },
  {
    id: "user-videos",
    kind: "user",
    url: "https://www.nicovideo.jp/user/2/video",
  },
  {
    id: "series",
    kind: "series",
    url: "https://www.nicovideo.jp/series/1",
  },
  {
    id: "public-mylist",
    kind: "mylist",
    url: "https://www.nicovideo.jp/mylist/1000",
  },
  {
    id: "history",
    kind: "account-listing",
    url: "https://www.nicovideo.jp/my/history",
  },
  {
    id: "following",
    kind: "account-listing",
    url: "https://www.nicovideo.jp/my/fav/user",
  },
] as const;
