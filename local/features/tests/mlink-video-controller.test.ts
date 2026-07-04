import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const projectRoot = join(import.meta.dir, "..");
const controllerRoot = join(projectRoot, "src", "mlink-video-controller");

function readControllerFile(path: string): string {
  return readFileSync(join(controllerRoot, path), "utf8");
}

function listSourceFiles(dir: string = controllerRoot): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return [fullPath];
  });
}

describe("mlink-video-controller structure", () => {
  test("keeps source files at root or one folder below root", () => {
    const tooDeepFiles = listSourceFiles()
      .map((file) => relative(controllerRoot, file))
      .filter((file) => file.split(sep).length > 2);

    expect(tooDeepFiles).toEqual([]);
  });

  test("exposes the stable panel tabs", () => {
    const panelTemplate = readControllerFile("templates/panel.ts");

    for (const tab of [
      "playback",
      "volume",
      "speed",
      "comments",
      "links",
      "settings",
    ]) {
      expect(panelTemplate).toContain(`data-tab="${tab}"`);
      expect(panelTemplate).toContain(`id="${tab}"`);
    }
  });

  test("keeps links sub tabs and comment search controls available", () => {
    const linksTemplate = readControllerFile("templates/links.ts");
    const commentsTemplate = readControllerFile("templates/comments.ts");

    for (const subtab of ["custom", "services", "dataManagement"]) {
      expect(linksTemplate).toContain(`data-subtab="${subtab}"`);
      expect(linksTemplate).toContain(`id="${subtab}"`);
    }

    for (const selector of [
      "comment-search-input",
      "regex-toggle",
      "extended-toggle",
      "search-btn",
      "clear-btn",
      "search-results",
    ]) {
      expect(commentsTemplate).toContain(selector);
    }
  });

  test("keeps heatmap available either in playback UI or as a module", () => {
    const playbackTemplate = readControllerFile("templates/playback.ts");
    const registry = readControllerFile("module-handlers/module-registry.ts");
    const heatmapModuleExists = existsSync(
      join(controllerRoot, "modules", "heatmap-module.ts"),
    );

    const hasInlineHeatmap =
      playbackTemplate.includes("heatmap-canvas") &&
      playbackTemplate.includes("heatmap-mode-btn");
    const hasModuleHeatmap =
      heatmapModuleExists &&
      registry.includes("heatmapModuleConfig") &&
      registry.includes("heatmap");

    expect(hasInlineHeatmap || hasModuleHeatmap).toBe(true);
  });

  test("keeps panel input key protection out of the capture phase", () => {
    const panelSource = readControllerFile("panels/link-video.ts");

    expect(panelSource).toContain(
      "入力欄自身のハンドラを動かした後、外側への伝搬だけを止める",
    );
    expect(panelSource).not.toContain("useCapture = true で早期にキャッチ");
  });
});
