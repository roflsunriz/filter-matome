import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { composeHarajukuStylesheet } from "../scripts/harajuku-stylesheet";
import {
  HARAJUKU_ACTIVE_ATTRIBUTE,
  HARAJUKU_ACTIVE_VALUE,
  HARAJUKU_STYLESHEET_ID,
  HARAJUKU_STYLESHEET_PATH,
} from "../src/mlink-video-controller/modules/harajuku-style-contract";

const projectRoot = resolve(import.meta.dirname, "..");

test("Harajuku CSSはactive scope内で!importantなしに生成される", async () => {
  const stylesheet = await composeHarajukuStylesheet(projectRoot);
  expect(stylesheet).toContain(
    `@scope (:root[${HARAJUKU_ACTIVE_ATTRIBUTE}="${HARAJUKU_ACTIVE_VALUE}"])`,
  );
  expect(stylesheet).toContain(":scope {\n    --hy-bg:");
  expect(stylesheet).not.toContain("  :root");
  expect(stylesheet).not.toContain("!important");
});

test("Watch用nlFilterが公式CSSより前に独立stylesheetを読み込む", async () => {
  const filter = await readFile(
    resolve(projectRoot, "../../nlFilters/104_watch_harajuku_style.txt"),
    "utf8",
  );
  expect(filter).toContain(`id="${HARAJUKU_STYLESHEET_ID}"`);
  expect(filter).toContain(`href="${HARAJUKU_STYLESHEET_PATH}"`);
  expect(filter).toContain("(<head(?:[^>]+)?>)");
});
