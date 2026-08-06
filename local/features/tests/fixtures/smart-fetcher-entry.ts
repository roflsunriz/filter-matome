import { startSmartFetcherApp } from "@/movie-fetcher/scheduler-app";

(
  window as Window & { startSmartFetcherTest?: () => Promise<void> }
).startSmartFetcherTest = startSmartFetcherApp;
