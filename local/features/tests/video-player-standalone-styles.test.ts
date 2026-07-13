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

  test("renders the mlink background variables on a fixed layer behind the page", () => {
    expect(STANDALONE_PAGE_STYLES).toContain(
      'body.nc-standalone-body[data-comment-background-mode="background-image"] #nc-standalone-player-root::before',
    );
    expect(STANDALONE_PAGE_STYLES).toContain(
      "background-image: var(--bg-img, none)",
    );
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /data-comment-background-mode="background-image"\] #nc-standalone-player-root::before \{[^}]*position: fixed;[^}]*z-index: 0;/,
    );
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /#nc-standalone-player-root \{[^}]*isolation: isolate;/,
    );
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /\.nc-standalone-page \{[^}]*position: relative;[^}]*z-index: 1;/,
    );
  });

  test("keeps the background toggle slightly squared", () => {
    expect(STANDALONE_PAGE_STYLES).toMatch(
      /\.nc-comment-background-toggle \{[^}]*border-radius: var\(--nc-radius-sm\);/,
    );
    expect(STANDALONE_PAGE_STYLES).not.toMatch(
      /\.nc-comment-background-toggle \{[^}]*border-radius: 999px;/,
    );
  });
});
