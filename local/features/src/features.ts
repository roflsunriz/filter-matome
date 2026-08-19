import {
  getFeaturePage,
  isMlinkPage,
  isNiconicoPage,
  isWatchPage,
} from "@/runtime/page-context";
import {
  addNavigationListener,
  installNavigationMonitor,
} from "@/runtime/navigation";

type CommentFilterModule = typeof import("@/comment-filter2/index");
type CommonModule = typeof import("@/common/index");
type MlinkModule = typeof import("@/mlink-video-controller/index");
type MovieInfoModule = typeof import("@/movie-info/index");
type MovieFetcherModule = typeof import("@/movie-fetcher/index");
type SmartFetcherModule = typeof import("@/movie-fetcher/scheduler-app");
type MylistModule = typeof import("@/mylist2/index");
type VideoPlayerRouterModule = typeof import("@/video-player/index");
type StandalonePlayerModule = typeof import("@/video-player/standalone/main");
type WatchHistoryModule = typeof import("@/watch-history/app");
type WatchTrackerModule = typeof import("@/watch-history/watch-tracker");

type FeatureRuntimeWindow = Window & {
  __filterMatomeFeaturesStarted?: boolean;
};

declare const FILTER_MATOME_VERSION: string;

const runtimeWindow = window as FeatureRuntimeWindow;
const ENTRY_BASE_URL = "/local/features/dist/entries";

async function loadEntry<T>(path: string): Promise<T> {
  const loaded: unknown = await import(
    `${ENTRY_BASE_URL}/${path}.js?v=${FILTER_MATOME_VERSION}`
  );
  return loaded as T;
}

async function startCommon(): Promise<void> {
  const module = await loadEntry<CommonModule>("common/index");
  module.startCommon();
}

async function activateFeaturePage(
  featurePage: NonNullable<ReturnType<typeof getFeaturePage>>,
): Promise<void> {
  switch (featurePage) {
    case "mylist": {
      const [common, mylist] = await Promise.all([
        loadEntry<CommonModule>("common/index"),
        loadEntry<MylistModule>("mylist2/index"),
      ]);
      common.startCommon();
      mylist.startMylist2();
      return;
    }
    case "movie-info": {
      const [common, movieInfo] = await Promise.all([
        loadEntry<CommonModule>("common/index"),
        loadEntry<MovieInfoModule>("movie-info/index"),
      ]);
      common.startCommon();
      movieInfo.startMovieInfo();
      return;
    }
    case "movie-fetcher": {
      const [common, smartFetcher] = await Promise.all([
        loadEntry<CommonModule>("common/index"),
        loadEntry<SmartFetcherModule>("movie-fetcher/scheduler-app"),
      ]);
      common.startCommon();
      await smartFetcher.startSmartFetcherApp();
      return;
    }
    case "watch-history": {
      const [common, watchHistory] = await Promise.all([
        loadEntry<CommonModule>("common/index"),
        loadEntry<WatchHistoryModule>("watch-history/app"),
      ]);
      common.startCommon();
      watchHistory.startWatchHistoryApp();
      return;
    }
    case "video-player": {
      const [common, commentFilter, mlink, tracker, player] = await Promise.all(
        [
          loadEntry<CommonModule>("common/index"),
          loadEntry<CommentFilterModule>("comment-filter2/index"),
          loadEntry<MlinkModule>("mlink-video-controller/index"),
          loadEntry<WatchTrackerModule>("watch-history/watch-tracker"),
          loadEntry<StandalonePlayerModule>("video-player/standalone/main"),
        ],
      );
      common.startCommon();
      commentFilter.startCommentFilter2();
      mlink.startMlinkVideoController();
      tracker.startWatchTracker();
      await player.startStandalonePlayer();
    }
  }
}

async function activateCurrentPage(): Promise<void> {
  const featurePage = getFeaturePage();
  if (featurePage) {
    await activateFeaturePage(featurePage);
    return;
  }

  if (!isNiconicoPage()) {
    return;
  }

  const tasks: Promise<void>[] = [
    startCommon(),
    loadEntry<MovieFetcherModule>("movie-fetcher/index").then((module) => {
      module.startMovieFetcher();
    }),
  ];
  if (isMlinkPage()) {
    tasks.push(
      loadEntry<MlinkModule>("mlink-video-controller/index").then((module) => {
        module.startMlinkVideoController();
      }),
    );
  }
  if (isWatchPage()) {
    tasks.push(
      loadEntry<CommentFilterModule>("comment-filter2/index").then((module) => {
        module.startCommentFilter2();
      }),
      loadEntry<VideoPlayerRouterModule>("video-player/index").then(
        (module) => {
          module.startVideoPlayerRouter();
        },
      ),
      loadEntry<WatchTrackerModule>("watch-history/watch-tracker").then(
        (module) => {
          module.startWatchTracker();
        },
      ),
    );
  }
  await Promise.all(tasks);
}

function reportActivationError(error: unknown): void {
  console.error("[features] 機能の読み込みに失敗しました", error);
}

function startRuntime(): void {
  if (runtimeWindow.__filterMatomeFeaturesStarted) {
    return;
  }
  runtimeWindow.__filterMatomeFeaturesStarted = true;

  const activate = (): void => {
    void activateCurrentPage().catch(reportActivationError);
    addNavigationListener(() => {
      void activateCurrentPage().catch(reportActivationError);
    });
    installNavigationMonitor();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate, { once: true });
  } else {
    activate();
  }
}

startRuntime();
