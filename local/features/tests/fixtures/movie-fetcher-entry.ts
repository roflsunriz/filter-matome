import { startMovieFetcher } from "@/movie-fetcher/index";

(
  window as Window & { startMovieFetcherTest?: () => void }
).startMovieFetcherTest = startMovieFetcher;
