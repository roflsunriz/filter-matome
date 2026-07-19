import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FRAGMENT_NAMES = [
  "history",
  "statistics-and-series",
  "dialogs",
  "database-dialog",
] as const;

/** Build時とブラウザテストで同じHTML断片構成を使う。 */
export function composeWatchHistoryDocument(projectRoot: string): string {
  const watchHistoryRoot = resolve(projectRoot, "src/watch-history");
  let document = readFileSync(resolve(watchHistoryRoot, "index.html"), "utf8");

  for (const name of FRAGMENT_NAMES) {
    const marker = `<!-- @include:${name} -->`;
    const fragment = readFileSync(
      resolve(watchHistoryRoot, "page", `${name}.html`),
      "utf8",
    );
    if (!document.includes(marker)) {
      throw new Error(`Watch history document marker is missing: ${marker}`);
    }
    document = document.replace(marker, fragment.trimEnd());
  }

  return document;
}
