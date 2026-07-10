import { registerCacheDataManager } from "@/cache-data-manager/main";
import { startCommentFilter2 } from "@/comment-filter2/index";
import { startCommon } from "@/common/index";
import { startMlinkVideoController } from "@/mlink-video-controller/index";
import { startMovieInfo } from "@/movie-info/index";
import { startMylist2 } from "@/mylist2/index";
import {
  getFeaturePage,
  isMlinkPage,
  isNiconicoPage,
  isWatchPage,
} from "@/runtime/page-context";
import { startVideoPlayerRouter } from "@/video-player/index";
import { startStandalonePlayer } from "@/video-player/standalone/main";
import { startWatchHistoryApp } from "@/watch-history/app";
import { startWatchTracker } from "@/watch-history/watch-tracker";

type FeatureRuntimeWindow = Window & {
  __filterMatomeFeaturesStarted?: boolean;
};

const runtimeWindow = window as FeatureRuntimeWindow;

function activateCurrentPage(): void {
  const featurePage = getFeaturePage();
  if (featurePage) {
    startCommon();
    switch (featurePage) {
      case "mylist":
        startMylist2();
        return;
      case "movie-info":
        startMovieInfo();
        return;
      case "watch-history":
        startWatchHistoryApp();
        return;
      case "video-player":
        startCommentFilter2();
        startMlinkVideoController();
        startWatchTracker();
        void startStandalonePlayer();
        return;
    }
  }

  if (!isNiconicoPage()) {
    return;
  }

  startCommon();
  if (isMlinkPage()) {
    startMlinkVideoController();
  }
  if (isWatchPage()) {
    startCommentFilter2();
    startVideoPlayerRouter();
    startWatchTracker();
  }
}

function startRuntime(): void {
  if (runtimeWindow.__filterMatomeFeaturesStarted) {
    return;
  }
  runtimeWindow.__filterMatomeFeaturesStarted = true;

  registerCacheDataManager();

  const activate = (): void => {
    activateCurrentPage();
    let currentUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href === currentUrl) {
        return;
      }
      currentUrl = window.location.href;
      activateCurrentPage();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", activateCurrentPage);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate, { once: true });
  } else {
    activate();
  }
}

startRuntime();
