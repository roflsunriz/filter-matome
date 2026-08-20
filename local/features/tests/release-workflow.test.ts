import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const releaseWorkflow = readFileSync(
  resolve(repositoryRoot, ".github", "workflows", "release.yml"),
  "utf8",
).replaceAll("\r\n", "\n");

describe("decimal release notes workflow", () => {
  test("同名CHANGELOG節がある場合は整数部の節を重複追記しない", () => {
    const fallbackStart = releaseWorkflow.indexOf(
      "- name: Fallback notes for decimal tags without an exact section",
    );
    const fallbackEnd = releaseWorkflow.indexOf(
      "- name: Upload release notes",
      fallbackStart,
    );
    expect(fallbackStart).toBeGreaterThanOrEqual(0);
    expect(fallbackEnd).toBeGreaterThan(fallbackStart);

    const fallbackStep = releaseWorkflow.slice(fallbackStart, fallbackEnd);
    expect(fallbackStep).toContain(
      'if grep -E -q -- "${EXACT_SECTION_RE}" CHANGELOG.md; then\n' +
        "                exit 0",
    );
    expect(fallbackStep.indexOf("EXACT_SECTION_RE")).toBeLessThan(
      fallbackStep.indexOf("TAG_MAJOR"),
    );
  });
});
