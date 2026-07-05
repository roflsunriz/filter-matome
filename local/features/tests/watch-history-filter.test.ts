import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const appSource = readFileSync(
  join(projectRoot, "src", "watch-history", "app.ts"),
  "utf8",
);

function listenerCount(elementId: string, eventName: string): number {
  const escapedId = elementId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEvent = eventName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `this\\.elements\\["${escapedId}"\\]\\?\\.addEventListener\\(\\s*"${escapedEvent}"[\\s\\S]*?this\\.handleFilter\\(\\)`,
    "g",
  );
  return appSource.match(pattern)?.length ?? 0;
}

describe("watch-history filters", () => {
  test("date range filters update on input and change", () => {
    for (const elementId of ["filter-date-start", "filter-date-end"]) {
      expect(listenerCount(elementId, "input")).toBe(1);
      expect(listenerCount(elementId, "change")).toBe(1);
    }
  });

  test("loadData keeps entries as the unfiltered source list", () => {
    expect(appSource).toContain("const sanitizedFilter = this.cleanFilter");
    expect(appSource).toContain("this.config.filter = sanitizedFilter");
    expect(appSource).toContain(
      "watchHistoryDB.getAllEntries(\n        this.config.sortBy,\n        this.config.sortOrder,\n      )",
    );
    expect(appSource).not.toContain(
      "watchHistoryDB.getAllEntries(\n        this.config.sortBy,\n        this.config.sortOrder,\n        sanitizedFilter",
    );
  });

  test("saved date range filter is reflected back to the controls", () => {
    expect(appSource).toContain("this.toDateInputValue(");
    expect(appSource).toContain('this.elements["filter-date-start"]');
    expect(appSource).toContain('this.elements["filter-date-end"]');
    expect(appSource).toContain(
      "completedFilter.checked = this.config.filter.completedOnly === true",
    );
  });
});
