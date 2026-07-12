import { describe, expect, test } from "bun:test";

import {
  createMaterialIcon,
  getIconPath,
  ICONS,
} from "../src/common/material-icons";

describe("common material icons", () => {
  test("outlined replay icon is connected to the bundled icon map", () => {
    const iconPath = getIconPath(ICONS.replay, "outlined");

    expect(iconPath).toStartWith("data:image/svg+xml,");
    expect(createMaterialIcon(ICONS.replay)).toContain(`src="${iconPath}"`);
  });
});
