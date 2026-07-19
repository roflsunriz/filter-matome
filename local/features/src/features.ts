import {
  getFeaturePage,
  isMlinkPage,
  isNiconicoPage,
  isWatchPage,
} from "@/runtime/page-context";

type CacheDataManagerModule = typeof import("@/cache-data-manager/main");
type CommentFilterModule = typeof import("@/comment-filter2/index");
type CommonModule = typeof import("@/common/index");
type MlinkModule = typeof import("@/mlink-video-controller/index");
type MovieInfoModule = typeof import("@/movie-info/index");
type MylistModule = typeof import("@/mylist2/index");
type VideoPlayerRouterModule = typeof import("@/video-player/index");
type StandalonePlayerModule = typeof import("@/video-player/standalone/main");
type WatchHistoryModule = typeof import("@/watch-history/app");
type WatchTrackerModule = typeof import("@/watch-history/watch-tracker");

type FeatureRuntimeWindow = Window & {
  __filterMatomeFeaturesStarted?: boolean;
};

const runtimeWindow = window as FeatureRuntimeWindow;
const ENTRY_BASE_URL = "/local/features/dist/entries";

async function loadEntry<T>(path: string): Promise<T> {
  const loaded: unknown = await import(`${ENTRY_BASE_URL}/${path}.js`);
  return loaded as T;
}

function registerLazyCacheDataManager(): void {
  let modulePromise: Promise<CacheDataManagerModule> | null = null;
  window.makeCacheList = (): void => {
    modulePromise ??= loadEntry<CacheDataManagerModule>(
      "cache-data-manager/main",
    );
    void modulePromise
      .then((module) => {
        module.registerCacheDataManager();
        window.makeCacheList();
      })
      .catch((error: unknown) => {
        console.error(
          "[features] cache-data-managerの読み込みに失敗しました",
          error,
        );
      });
  };
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

  const tasks: Promise<void>[] = [startCommon()];
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

  registerLazyCacheDataManager();

  const activate = (): void => {
    void activateCurrentPage().catch(reportActivationError);
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href === currentUrl) {
        return;
      }
      currentUrl = window.location.href;
      void activateCurrentPage().catch(reportActivationError);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", () => {
      void activateCurrentPage().catch(reportActivationError);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate, { once: true });
  } else {
    activate();
  }
}

startRuntime();
