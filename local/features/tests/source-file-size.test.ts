import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const PROJECT_ROOT = join(import.meta.dirname, "..");
const CHECKED_ROOTS = ["src", "tests", "scripts"].map((directory) =>
  join(PROJECT_ROOT, directory),
);
const MAX_LINES = 1000;
const CHECKED_EXTENSIONS = new Set([".ts", ".css", ".html"]);

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(path);
      return CHECKED_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

describe("source file responsibilities", () => {
  test(`each source file stays at or below ${MAX_LINES} lines`, async () => {
    const oversized: string[] = [];
    for (const root of CHECKED_ROOTS) {
      for (const path of await collectSourceFiles(root)) {
        const lineCount = (await readFile(path, "utf8")).split(/\r?\n/).length;
        if (lineCount > MAX_LINES) {
          oversized.push(
            `${relative(PROJECT_ROOT, path).replaceAll("\\", "/")}: ${lineCount}`,
          );
        }
      }
    }

    expect(oversized, oversized.join("\n")).toEqual([]);
  });
});
