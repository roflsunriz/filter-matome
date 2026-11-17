import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createMaterialIcon,
  getIconPath,
  ICONS,
} from "../src/common/material-icons";
import { outlinedIconMap } from "../src/common/icon-assets";

describe("common material icons", () => {
  test("outlined replay icon is connected to the bundled icon map", () => {
    const iconPath = getIconPath(ICONS.replay, "outlined");

    expect(iconPath).toStartWith("data:image/svg+xml,");
    expect(createMaterialIcon(ICONS.replay)).toContain(`src="${iconPath}"`);
  });

  test("all common icon constants resolve to bundled SVGs", () => {
    for (const iconName of Object.values(ICONS)) {
      expect(getIconPath(iconName)).toStartWith("data:image/svg+xml,");
    }
  });

  test("static HTML icon declarations resolve to bundled SVGs", () => {
    const sourceRoot = resolve(import.meta.dirname, "../src");
    let iconCount = 0;
    for (const path of new Bun.Glob("**/*.html").scanSync(sourceRoot)) {
      const html = readFileSync(resolve(sourceRoot, path), "utf8");
      for (const [, iconName] of html.matchAll(/\bdata-icon="([^"]+)"/g)) {
        expect(outlinedIconMap, `${path}: ${iconName}`).toHaveProperty(
          iconName,
        );
        iconCount++;
      }
    }
    expect(iconCount).toBeGreaterThan(0);
  });
});
