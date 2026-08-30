import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isCommonHeaderPage, isNiconicoPage } from "@/runtime/page-context";

const serviceUrls = [
  "https://www.nicovideo.jp/",
  "https://seiga.nicovideo.jp/",
  "https://live.nicovideo.jp/",
  "https://ch.nicovideo.jp/",
  "https://dic.nicovideo.jp/",
  "https://site.nicovideo.jp/jk/",
  "https://anime.nicovideo.jp/",
  "https://ch.nicovideo.jp/portal/blomaga",
  "https://commons.nicovideo.jp/",
  "https://nicoft.io/",
  "https://q.nicovideo.jp/",
  "https://koken.nicovideo.jp/",
  "https://3d.nicovideo.jp/",
  "https://news.nicovideo.jp/",
  "https://www.beta.hiroba.nicovideo.jp/",
];

function locationFor(value: string): Location {
  return new URL(value) as unknown as Location;
}

test("CommonHeader導入15サービスを共通機能の対象にする", () => {
  for (const url of serviceUrls) {
    expect(isCommonHeaderPage(locationFor(url))).toBe(true);
  }
  expect(isCommonHeaderPage(locationFor("https://example.com/"))).toBe(false);
});

test("NicoFTではニコニコ動画専用機能を起動しない", () => {
  expect(isNiconicoPage(locationFor("https://nicoft.io/"))).toBe(false);
  expect(
    isNiconicoPage(locationFor("https://www.beta.hiroba.nicovideo.jp/")),
  ).toBe(true);
});

test("100番フィルターが15サービスへ同一オリジンでfeaturesを挿入する", async () => {
  const source = await readFile(
    resolve(import.meta.dirname, "../../../nlFilters/100_features.txt"),
    "utf8",
  );
  const pattern = /^FullURL = (.+)$/mu.exec(source)?.[1];
  expect(pattern).toBeDefined();
  const matcher = new RegExp(pattern ?? "(?!)", "u");
  for (const url of serviceUrls) {
    expect(matcher.test(url)).toBe(true);
  }
  expect(matcher.test("https://example.com/")).toBe(false);
  expect(source).toContain('<script src="/local/features/dist/features.js"');
});

test("遅延エントリーも対象ページと同じローカル配信から読む", async () => {
  const source = await readFile(
    resolve(import.meta.dirname, "../src/features.ts"),
    "utf8",
  );
  expect(source).toContain(
    'const ENTRY_BASE_URL = "/local/features/dist/entries";',
  );
});
