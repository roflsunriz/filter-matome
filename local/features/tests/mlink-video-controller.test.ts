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

    const linkManager = readControllerFile("services/link-manager.ts");
    const commentJsonDownload = readControllerFile(
      "utils/comment-json-download.ts",
    );
    expect(linkManager).not.toContain("watchVideoFilter");
    expect(linkManager).not.toContain("動画非表示設定");
    expect(linkManager).toContain("保存:コメントJSON");
    expect(linkManager).toContain("downloadCommentsJson(videoId)");
    expect(linkManager).not.toContain("/cache/${threadId}.xml");
    expect(commentJsonDownload).toContain(
      "window.commonHelper.fetchNicoDataWithComments(videoId)",
    );
    expect(commentJsonDownload).toContain("threads: data.threads");
    expect(commentJsonDownload).toContain(
      "JSON.stringify(exportData, null, 2)",
    );

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

  test("keeps heatmap controls in module settings", () => {
    const playbackTemplate = readControllerFile("templates/playback.ts");
    const registry = readControllerFile("module-handlers/module-registry.ts");
    const settingsUi = readControllerFile("module-handlers/settings-ui.ts");
    const heatmapModuleExists = existsSync(
      join(controllerRoot, "modules", "heatmap-module.ts"),
    );

    const hasModuleHeatmap =
      heatmapModuleExists &&
      registry.includes("heatmapModuleConfig") &&
      registry.includes("heatmap");

    expect(playbackTemplate).toContain("heatmap-canvas");
    expect(playbackTemplate).not.toContain("heatmap-mode-btn");
    expect(settingsUi).toContain("open-heatmap-settings");
    expect(settingsUi).toContain("open-header-privacy-settings");
    expect(settingsUi).toContain("heatmap-settings-modal");
    expect(settingsUi).toContain("open-thumbnails-filter-settings");
    expect(hasModuleHeatmap).toBe(true);
  });

  test("keeps panel input key protection out of the capture phase", () => {
    const panelSource = readControllerFile("panels/link-video.ts");

    expect(panelSource).toContain(
      "入力欄自身のハンドラを動かした後、外側への伝搬だけを止める",
    );
    expect(panelSource).not.toContain("useCapture = true で早期にキャッチ");
  });
});
