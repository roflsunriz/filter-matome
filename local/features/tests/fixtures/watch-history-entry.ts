import { startWatchHistoryApp } from "@/watch-history/app";
import { watchHistoryDB } from "@/watch-history/database";

Object.assign(window, {
  WatchHistoryTest: {
    startWatchHistoryApp,
    getEntriesPage: watchHistoryDB.getEntriesPage.bind(watchHistoryDB),
  },
});
