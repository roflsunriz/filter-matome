import { describe, expect, test } from "bun:test";

import { STANDALONE_PAGE_STYLES } from "@/video-player/standalone/styles";

describe("video-player standalone color rules", () => {
  test("uses the shared background, surface and badge colors", () => {
    expect(STANDALONE_PAGE_STYLES).toContain(
      "background: var(--nc-surface); border: 1px solid var(--nc-border)",
    );
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /\.nc-stat-item \{[^}]*background: var\(--nc-surface-subtle\)/,
    );
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /\.nc-tag \{[^}]*background: var\(--nc-surface-subtle\)/,
    );
    expect(STANDALONE_PAGE_STYLES).not.toContain(
      "background: rgba(20, 24, 36, 0.88)",
    );
  });
});
