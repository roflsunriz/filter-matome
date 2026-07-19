import { startWatchHistoryApp } from "@/watch-history/app";
import { watchHistoryDB } from "@/watch-history/database";
import { startWatchTracker } from "@/watch-history/watch-tracker";
import { installNavigationMonitor } from "@/runtime/navigation";

Object.assign(window, {
  WatchHistoryTest: {
    startWatchHistoryApp,
    getEntriesPage: watchHistoryDB.getEntriesPage.bind(watchHistoryDB),
    getEntry: watchHistoryDB.getEntry.bind(watchHistoryDB),
    startWatchTracker,
    installNavigationMonitor,
  },
});
