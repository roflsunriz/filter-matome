import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const extensionDirectory = resolve(repositoryRoot, "extensions");

const expectedLogTabs = new Map<string, string>([
  ["CommentFilterLogger.java", "CommentFilter"],
  ["DestroyAds.java", "DestroyAds"],
  ["ExtUtil.java", "ExtUtil"],
  ["FilterMatomeSeriesAlerts.java", "Series Alerts"],
  ["FilterMatomeSmartFetcher.java", "smartFetcher"],
  ["NicochartInfoProxy.java", "NicochartInfoProxy"],
  ["nlGpac.java", "GPAC"],
  ["nlMovieFetcher.java", "nlMovieFetcher"],
]);

describe("NicoCacheGUI extension log tabs", () => {
  test("全extensionが検索UI付きのNicoCache_nl正式ロガーを登録する", () => {
    const sourceNames = readdirSync(extensionDirectory)
      .filter((name) => name.endsWith(".java"))
      .sort();
    expect(sourceNames).toEqual([...expectedLogTabs.keys()].sort());

    for (const sourceName of sourceNames) {
      const source = readFileSync(
        resolve(extensionDirectory, sourceName),
        "utf8",
      );
      const expectedTitle = expectedLogTabs.get(sourceName);

      expect(expectedTitle).toBeDefined();
      expect(source).toContain("NLMain.getExtLogger(");
      expect(source).toContain(`"${expectedTitle}"`);
      expect(source).toContain("LoggerHandler");
      expect(source).toMatch(/NLMain\.getExtLogger\([\s\S]{0,160},\s*true\)/u);
      expect(source).not.toMatch(
        /\bLogger\.(?:debug|info|warning|error)\s*\(/u,
      );
      expect(source).not.toContain("NLMain.addTab(");
      expect(source).not.toMatch(/JTextArea\s+logArea/u);
    }
  });

  test("各extensionを追加の内部classなしで配布できる", () => {
    for (const sourceName of [...expectedLogTabs.keys()]) {
      const source = readFileSync(
        resolve(extensionDirectory, sourceName),
        "utf8",
      );
      expect(source.match(/\bclass\s+[A-Za-z]/gu)).toHaveLength(1);
    }
  });
});
