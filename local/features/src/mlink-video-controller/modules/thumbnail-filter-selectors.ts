import type {
  NicovideoSelectors,
  UrlPatterns,
} from "@/types/thumbnails-filter-types";

export const NICOVIDEO_SELECTORS: NicovideoSelectors = {
  VIDEO_ELEMENTS: {
    watch: [
      'a[data-anchor-page="watch"][data-anchor-area="playlist"]',
      'a[data-anchor-page="watch"][data-anchor-area="nicoad_videos"]',
      'a[data-anchor-page="watch"]',
    ].join(","),
    top: ".NC-VideoCard",
    ranking: ".NC-Card",
    tag: ".item[data-video-item]",
    search:
      '.item[data-video-item], [data-decoration-video-id][data-anchor-page="search"]',
    other: "",
  },
  TITLE_ELEMENTS: {
    watch: {
      playlist: "h2",
      nicoad: "p",
      default: "h2",
    },
    top: ".NC-CardTitle",
    ranking: ".NC-CardTitle",
    tag: ".itemTitle a",
    search:
      '.itemTitle a, a[data-anchor-page="search"][href*="/watch/"].fw_bold',
    other: "",
  },
  PARENT_ELEMENTS: {
    watch: "",
    top: ".NC-Card",
    ranking: ".NC-Card",
    tag: ".item",
    search: '.item, [data-decoration-video-id][data-anchor-page="search"]',
    other: "",
  },
};

export const URL_PATTERNS: UrlPatterns = {
  WATCH: "/watch/",
  TAG: "/tag/",
  SEARCH: "/search/",
  RANKING: "/ranking",
  VIDEO_TOP: "/video_top",
};
