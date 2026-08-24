import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("ニコニコページではcommonグローバルを各機能より先に起動する", async () => {
  const source = await readFile(
    resolve(import.meta.dirname, "../src/features.ts"),
    "utf8",
  );
  const activation =
    /async function activateCurrentPage\(\): Promise<void> \{(?<body>[\s\S]*?)\n\}/u.exec(
      source,
    )?.groups?.["body"];
  expect(activation).toBeDefined();

  const commonStart = activation?.indexOf("await startCommon();") ?? -1;
  const featureTasks =
    activation?.indexOf("const tasks: Promise<void>[]") ?? -1;
  expect(commonStart).toBeGreaterThanOrEqual(0);
  expect(featureTasks).toBeGreaterThan(commonStart);
});
