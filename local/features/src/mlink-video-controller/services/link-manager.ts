import { LinkData, ActionMap } from "@/types/mlink-video-controller-types";
import {
  isMylist2AddSupportedPage,
  Mylist2Handler,
} from "@/mlink-video-controller/handlers/mylist2";
import {
  handleVideoOperation,
  getActiveVideoId,
} from "@/mlink-video-controller/utils/video-util";
import { downloadCommentsJson } from "@/mlink-video-controller/utils/comment-json-download";
import { isWatchLikePage } from "@/mlink-video-controller/utils/page-detect";
import { getIconPath } from "@/common/material-icons";

export class LinkManager {
  private static instance: LinkManager;
  private commentFilterReady: boolean = false;
  private readonly WATCH_PAGE_ONLY_ACTIONS = new Set<string>([
    "commentFilter2",
    "movieinfo",
    "savemovie",
    "saveaudio",
    "savecomment",
    "cache_remove",
  ]);

  private readonly LINK_GROUPS = {
    favorites: [] as LinkData[],
    custom: [
      {
        id: "customMylist",
        title: "mylist2",
        icon: getIconPath("playlist_add", "outlined"),
        action: "customMylist",
      },
      {
        id: "AddVideoToCustomMylist",
        title: "mylist2に追加",
        icon: getIconPath("playlist_add_circle", "outlined"),
        action: "AddVideoToCustomMylist",
      },
      {
        id: "commentFilter2",
        title: "comment-filter2",
        icon: getIconPath("filter_list", "outlined"),
        action: "commentFilter2",
      },
      {
        id: "watch-history",
        title: "視聴履歴",
        icon: getIconPath("history", "outlined"),
        action: "watch-history",
      },
      {
        id: "smart-fetcher",
        title: "smartFetcher",
        icon: getIconPath("schedule", "outlined"),
        action: "smart-fetcher",
      },
    ] as LinkData[],
    services: [
      {
        id: "nicochart",
        title: "ニコチャート",
        icon: getIconPath("trending_up", "outlined"),
        action: "nicochart",
      },
      {
        id: "nicolog",
        title: "ニコログ",
        icon: getIconPath("search", "outlined"),
        action: "nicolog",
      },
      {
        id: "nicoran",
        title: "ニコラン",
        icon: getIconPath("trending_up", "outlined"),
        action: "nicoran",
      },
      {
        id: "nicozon",
        title: "nicozon",
        icon: getIconPath("storage", "outlined"),
        action: "nicozon",
      },
      {
        id: "search",
        title: "超検索",
        icon: getIconPath("search", "outlined"),
        action: "search",
      },
      {
        id: "commentviewer",
        title: "コメントビューア",
        icon: getIconPath("comment", "outlined"),
        action: "commentviewer",
      },
      {
        id: "nicodb",
        title: "ニコ生クリ奨ランキング",
        icon: getIconPath("live_tv", "outlined"),
        action: "nicodb",
      },
      {
        id: "ikioi",
        title: "ニコ生勢いランキング",
        icon: getIconPath("live_tv", "outlined"),
        action: "ikioi",
      },
      {
        id: "cytube",
        title: "CTV☆",
        icon: getIconPath("star", "outlined"),
        action: "cytube",
      },
      {
        id: "yajuyaju",
        title: "ヤジュヤジュ動画",
        icon: getIconPath("movie", "outlined"),
        action: "yajuyaju",
      },
    ] as LinkData[],
    dataManagement: [
      {
        id: "movieinfo",
        title: "Movie Info",
        icon: getIconPath("dashboard", "outlined"),
        action: "movieinfo",
      },
      {
        id: "savemovie",
        title: "保存:動画",
        icon: getIconPath("download", "outlined"),
        action: "savemovie",
      },
      {
        id: "saveaudio",
        title: "保存:音声",
        icon: getIconPath("audiotrack", "outlined"),
        action: "saveaudio",
      },
      {
        id: "savecomment",
        title: "保存:コメントJSON",
        icon: getIconPath("comment", "outlined"),
        action: "savecomment",
      },
      {
        id: "cache_remove",
        title: "削除:キャッシュ",
        icon: getIconPath("clear", "outlined"),
        action: "cache_remove",
      },
    ] as LinkData[],
  };

  private constructor() {
    // CommentFilter2の初期化完了を監視
    window.addEventListener("CommentFilter2Ready", () => {
      this.commentFilterReady = true;
    });

    // 既に初期化済みかチェック
    if (window.CommentFilter2Instance) {
      this.commentFilterReady = true;
    }
  }

  public static getInstance(): LinkManager {
    if (!LinkManager.instance) {
      LinkManager.instance = new LinkManager();
    }
    return LinkManager.instance;
  }

  /**
   * 表示用リンク一覧を返す。非視聴ページでは視聴ページ専用アクションをdisabledにする。
   */
  public async getLinks(
    group: keyof typeof this.LINK_GROUPS,
  ): Promise<LinkData[]> {
    await Promise.resolve();
    const links = this.LINK_GROUPS[group];
    const shouldDisableWatchOnly = !isWatchLikePage();
    return links.map((link) => ({
      ...link,
      disabled:
        link.action === "AddVideoToCustomMylist"
          ? !isMylist2AddSupportedPage()
          : shouldDisableWatchOnly &&
            this.WATCH_PAGE_ONLY_ACTIONS.has(link.action),
      disabledReason:
        link.action === "AddVideoToCustomMylist"
          ? "視聴・検索・タグページで利用できます"
          : "視聴ページでのみ利用できます",
    }));
  }

  private openServiceLink(topUrl: string, videoUrl: string): void {
    window.open(videoUrl || topUrl);
  }

  public async handleAction(action: string): Promise<void> {
    const isWatchPage = isWatchLikePage();
    if (action === "AddVideoToCustomMylist" && !isMylist2AddSupportedPage()) {
      window.toastr?.info("視聴・検索・タグページで利用できます", "利用不可", {
        timeOut: 3000,
      });
      return;
    }
    if (!isWatchPage && this.WATCH_PAGE_ONLY_ACTIONS.has(action)) {
      window.toastr?.info(
        "このリンクは視聴ページでのみ利用できます",
        "利用不可",
        { timeOut: 3000 },
      );
      return;
    }

    if (action === "AddVideoToCustomMylist") {
      await new Mylist2Handler().handleAddFromCurrentPage();
      return;
    }

    const videoId = isWatchPage ? await getActiveVideoId() : "";
    // const commentFilterUI = new CommentFilterUI();

    const actionMap: ActionMap = {
      customMylist:
        "https://www.nicovideo.jp/local/features/dist/pages/mylist2/index.html",
      commentFilter2: async () => {
        try {
          // CommentFilter2のインスタンスを取得
          const commentFilter2Instance = window.CommentFilter2Instance;

          if (
            commentFilter2Instance &&
            typeof commentFilter2Instance.showUI === "function"
          ) {
            await commentFilter2Instance.showUI();
          } else {
            if (!this.commentFilterReady) {
              window.logger.warn(
                "CommentFilter2はまだ初期化中です。しばらく待ってから再試行してください。",
              );
            } else {
              window.logger.warn(
                "CommentFilter2が利用できません。先にCommentFilter2を読み込んでください。",
              );
            }
          }
        } catch (error) {
          window.logger.error("CommentFilter2の呼び出しに失敗しました:", error);
        }
      },
      movieinfo: () => {
        const baseUrl =
          "https://www.nicovideo.jp/local/features/dist/pages/movie-info/index.html";
        const targetUrl = videoId ? baseUrl + "?videoId=" + videoId : baseUrl;
        window.open(targetUrl);
      },
      savemovie: () => {
        if (!videoId) {
          window.logger?.warn(
            "動画情報がありません。視聴ページで実行してください。",
          );
          return;
        }
        window.open(
          `https://nicocachenl.test/api/v1/videos/${encodeURIComponent(videoId)}/exports/video`,
        );
      },
      saveaudio: () => {
        if (!videoId) {
          window.logger?.warn(
            "動画情報がありません。視聴ページで実行してください。",
          );
          return;
        }
        window.open(
          `https://nicocachenl.test/api/v1/videos/${encodeURIComponent(videoId)}/exports/audio`,
        );
      },
      savecomment: async () => {
        if (!videoId) {
          window.logger?.warn(
            "動画情報がありません。視聴ページで実行してください。",
          );
          return;
        }
        try {
          await downloadCommentsJson(videoId);
          window.toastr?.success(
            "コメントJSONをダウンロードしました",
            "保存完了",
          );
        } catch (error) {
          window.logger?.error(
            "コメントJSONのダウンロードに失敗しました:",
            error,
          );
          window.toastr?.error(
            "コメントJSONのダウンロードに失敗しました",
            "保存失敗",
          );
        }
      },
      cache_remove: () => {
        if (!videoId) {
          window.logger?.warn(
            "動画情報がありません。視聴ページで実行してください。",
          );
          return;
        }
        handleVideoOperation("cache_remove", videoId);
      },
      nicochart: () => {
        this.openServiceLink(
          "http://www.nicochart.jp/",
          videoId ? `http://www.nicochart.jp/watch/${videoId}` : "",
        );
      },
      nicolog: () => {
        this.openServiceLink(
          "https://www.nicolog.jp/",
          videoId ? `https://www.nicolog.jp/watch/${videoId}` : "",
        );
      },
      nicoran: () => {
        this.openServiceLink(
          "http://nicoranweb.com/",
          videoId ? `http://nicoranweb.com/watch/${videoId}` : "",
        );
      },
      nicozon: () => {
        this.openServiceLink(
          "https://www.nicozon.net/",
          videoId ? `https://www.nicozon.net/watch/${videoId}` : "",
        );
      },
      search: "https://gokulin.info/search/",
      commentviewer: "https://yyya-nico.com/nv-comment-viewer/",
      nicodb: "https://nicodb.net/",
      ikioi: "https://ikioi-ranking.com/v/nico",
      cytube: "https://cytube.mm428.net/r/cookie_tv",
      yajuyaju: "https://yajuvideo.st/",
      "watch-history": () => {
        window.open(
          `https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html`,
        );
      },
      "smart-fetcher": () => {
        const baseUrl =
          "https://www.nicovideo.jp/local/features/dist/pages/movie-fetcher/index.html";
        window.open(
          videoId
            ? `${baseUrl}?videoId=${encodeURIComponent(videoId)}`
            : baseUrl,
        );
      },
    };

    const actionValue = actionMap[action];
    if (typeof actionValue === "function") {
      await actionValue();
    } else if (actionValue) {
      window.open(actionValue);
    }
  }
}
