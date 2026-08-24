import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const extensionDirectory = resolve(repositoryRoot, "extensions");

const expectedLogTabs = new Map<string, string>([
  ["CommentFilterLogger.java", "CommentFilter"],
  ["ExtUtil.java", "ExtUtil"],
  ["FilterMatomeSeriesAlerts.java", "Series Alerts"],
  ["FilterMatomeSmartFetcher.java", "smartFetcher"],
  ["NicochartInfoProxy.java", "NicochartInfoProxy"],
  ["nlGpac.java", "GPAC"],
  ["nlMovieFetcher.java", "nlMovieFetcher"],
]);
const expectedNoLogExtensions = ["DestroyAds.java"] as const;

describe("NicoCacheGUI extension log tabs", () => {
  test("全extensionが検索UI付きのNicoCache_nl正式ロガーを登録する", () => {
    const sourceNames = readdirSync(extensionDirectory)
      .filter((name) => name.endsWith(".java"))
      .sort();
    expect(sourceNames).toEqual(
      [...expectedLogTabs.keys(), ...expectedNoLogExtensions].sort(),
    );

    for (const sourceName of sourceNames) {
      const source = readFileSync(
        resolve(extensionDirectory, sourceName),
        "utf8",
      );
      const expectedTitle = expectedLogTabs.get(sourceName);

      if (expectedNoLogExtensions.includes(sourceName as "DestroyAds.java")) {
        expect(source).not.toContain("NLMain.getExtLogger(");
        continue;
      }

      expect(expectedTitle).toBeDefined();
      expect(source).toContain("NLMain.getExtLogger(");
      expect(source).toContain(`"${expectedTitle}"`);
      expect(source).toContain("LoggerHandler");
      expect(source).not.toContain("NLMain.addTab(");
      expect(source).not.toMatch(/JTextArea\s+logArea/u);
    }
  });

  test("各extensionを追加の内部classなしで配布できる", () => {
    for (const sourceName of [
      ...expectedLogTabs.keys(),
      ...expectedNoLogExtensions,
    ]) {
      const source = readFileSync(
        resolve(extensionDirectory, sourceName),
        "utf8",
      );
      expect(source.match(/\bclass\s+[A-Za-z]/gu)).toHaveLength(1);
    }
  });
});
