import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  applyServerContextOverrides,
  isNvCommentPostRequest,
  parseServerContextOverrideConfig,
  readSessionUserType,
  restoreCommentPostMembership,
} from "../src/runtime/server-context-override";

const FILTER_PATH = join(
  import.meta.dirname,
  "../../../nlFilters/101_disable_official_function.txt",
);

describe("serverContext override config", () => {
  test("nlFilter内の実設定を解析でき、Java置換の禁止文字を含まない", async () => {
    const filter = await readFile(FILTER_PATH, "utf8");
    const configMatch = filter.match(
      /<script id="filter-matome-server-context-overrides" type="application\/json">\r?\n([\s\S]*?)\r?\n<\/script>/,
    );
    expect(configMatch).not.toBeNull();
    const config = parseServerContextOverrideConfig(configMatch?.[1] ?? "");
    expect(Object.keys(config).length).toBeGreaterThan(0);

    const serverContextSection = filter.match(
      /\[Replace\]\r?\nName = serverContext項目別書き換え用プレースホルダー\r?\n[\s\S]*?(?=\r?\n\[Replace\])/u,
    )?.[0];
    expect(serverContextSection).toBeDefined();
    const replaceBodyMatch = serverContextSection?.match(
      /Replace<\r?\n([\s\S]*?)\r?\n>/u,
    );
    expect(replaceBodyMatch).not.toBeNull();
    const replaceBody = replaceBodyMatch?.[1] ?? "";
    expect(replaceBody.replace("$1", "")).not.toContain("$");
    expect(replaceBody).not.toContain("\\");
    expect(replaceBody).not.toContain(" defer");
    expect(replaceBody).not.toContain(" async");
  });

  test("enabledの既存パスだけを書き換え、未知の項目を保持する", () => {
    const serverContext = {
      sessionUser: { type: "regular", nickname: "user" },
      video: { id: "sm9", optionalFlag: true },
    };
    const config = parseServerContextOverrideConfig(`{
      "sessionUser.type": { "enabled": true, "value": "premium" },
      "sessionUser.nickname": { "enabled": false, "value": "changed" },
      "video.missingFlag": { "enabled": true, "value": false }
    }`);

    expect(applyServerContextOverrides(serverContext, config)).toEqual([
      "sessionUser.type",
    ]);
    expect(serverContext).toEqual({
      sessionUser: { type: "premium", nickname: "user" },
      video: { id: "sm9", optionalFlag: true },
    });
  });

  test("動画種別によって中間オブジェクトがないパスを無視する", () => {
    const serverContext = {
      sessionUser: null,
      channel: { id: "ch1" },
    };
    const config = parseServerContextOverrideConfig(`{
      "sessionUser.type": { "enabled": true, "value": "premium" },
      "channel.id": { "enabled": true, "value": "ch2" }
    }`);

    expect(applyServerContextOverrides(serverContext, config)).toEqual([
      "channel.id",
    ]);
    expect(serverContext).toEqual({
      sessionUser: null,
      channel: { id: "ch2" },
    });
  });

  test("nullを実際の設定値として使用できる", () => {
    const serverContext = { sessionUser: { type: "regular" } };
    const config = parseServerContextOverrideConfig(`{
      "sessionUser": { "enabled": true, "value": null }
    }`);

    applyServerContextOverrides(serverContext, config);

    expect(serverContext.sessionUser).toBeNull();
  });

  test("不正な設定形式と危険なパスを拒否する", () => {
    expect(() =>
      parseServerContextOverrideConfig(`{
        "sessionUser.type": { "enabled": "yes", "value": "premium" }
      }`),
    ).toThrow();
    expect(() =>
      parseServerContextOverrideConfig(`{
        "__proto__.polluted": { "enabled": true, "value": true }
      }`),
    ).toThrow();
  });

  test("元の会員種別を型確認して読み取る", () => {
    expect(readSessionUserType({ sessionUser: { type: "premium" } })).toBe(
      "premium",
    );
    expect(readSessionUserType({ sessionUser: null })).toBeNull();
    expect(readSessionUserType({ sessionUser: { type: 1 } })).toBeNull();
  });
});

describe("comment post membership guard", () => {
  test("一般会員のpremiumフラグと専用色だけを除去する", () => {
    const body = JSON.stringify({
      body: "test",
      isPremium: true,
      premium: 1,
      commands: ["red2", "#12AbEf", "big"],
      chat: { isPremium: "1", premium: true },
    });

    expect(JSON.parse(restoreCommentPostMembership(body, "regular"))).toEqual({
      body: "test",
      isPremium: false,
      premium: 0,
      commands: ["big"],
      chat: { isPremium: "0", premium: false },
    });
  });

  test("元からpremiumなら投稿本文を変更しない", () => {
    const body = JSON.stringify({
      body: "test",
      isPremium: true,
      commands: ["red2"],
    });

    expect(restoreCommentPostMembership(body, "premium")).toBe(body);
  });

  test("対象のnvComment通常コメント投稿だけを識別する", () => {
    expect(
      isNvCommentPostRequest(
        new URL("https://nvcomment.nicovideo.jp/v1/threads/mock/comments"),
        "post",
      ),
    ).toBeTrue();
    expect(
      isNvCommentPostRequest(
        new URL(
          "https://nvcomment.nicovideo.jp/v1/threads/mock/comments/extra",
        ),
        "POST",
      ),
    ).toBeFalse();
    expect(
      isNvCommentPostRequest(
        new URL("https://www.nicovideo.jp/v1/threads/mock/comments"),
        "POST",
      ),
    ).toBeFalse();
  });
});
