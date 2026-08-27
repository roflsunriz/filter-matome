import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildGoogleSearchUrl,
  OfficialCommentMenu,
  resolveDirectCommentUrl,
  type OfficialCommentMenuDependencies,
} from "@/comment-filter2/integrations/official-comment-menu";

interface MenuFixture {
  menu: OfficialCommentMenu;
  copied: string[];
  opened: string[];
  addedWords: string[];
  addedUsers: string[];
  notifications: Array<{ level: string; message: string }>;
}

function createFixture(
  overrides: Partial<OfficialCommentMenuDependencies> = {},
): MenuFixture {
  const copied: string[] = [];
  const opened: string[] = [];
  const addedWords: string[] = [];
  const addedUsers: string[] = [];
  const notifications: Array<{ level: string; message: string }> = [];
  const menu = new OfficialCommentMenu({
    writeClipboard: async (text) => {
      copied.push(text);
    },
    openWindow: (url) => {
      opened.push(url);
    },
    addNgWord: async (word) => {
      addedWords.push(word);
      return { status: "added", reapplied: true };
    },
    addNgUser: async (userId) => {
      addedUsers.push(userId);
      return { status: "added", reapplied: true };
    },
    notify: (level, message) => {
      notifications.push({ level, message });
    },
    ...overrides,
  });
  return { menu, copied, opened, addedWords, addedUsers, notifications };
}

describe("公式コメントメニューAPI", () => {
  test("APIの公開と破棄をCommonHeaderの自動状態表示へ通知する", async () => {
    const source = await readFile(
      resolve(import.meta.dirname, "../src/comment-filter2/index.ts"),
      "utf8",
    );
    expect(source.match(/filter-matome:api-status-change/gu)?.length).toBe(2);
  });

  test("通常コメントへコピー・検索・comment-filter2 NG項目を返す", () => {
    const { menu } = createFixture();
    expect(menu.getItems({ body: "通常コメント", userId: "user-1" })).toEqual([
      { id: "copy-comment", label: "コメントをコピー" },
      { id: "google-search", label: "Googleで検索" },
      { id: "add-ng-word", label: "comment-filter2にNGワード追加" },
      {
        id: "add-ng-user",
        label: "comment-filter2にNGユーザーID追加",
      },
    ]);
  });

  test("本文全体がHTTP(S) URLの場合だけ直接開く項目を返す", () => {
    const { menu } = createFixture();
    expect(
      menu
        .getItems({ body: "https://example.com/path?q=1", userId: null })
        .map((item) => item.id),
    ).toEqual([
      "copy-comment",
      "google-search",
      "open-comment-url",
      "add-ng-word",
    ]);
    expect(
      menu
        .getItems({ body: "参照 https://example.com", userId: null })
        .map((item) => item.id),
    ).not.toContain("open-comment-url");
    expect(resolveDirectCommentUrl("javascript:alert(1)")).toBeNull();
  });

  test("コピー、Google検索、URL直開きをコメントモデルから実行する", async () => {
    const fixture = createFixture();
    const comment = { body: "  検索するコメント  ", userId: "user-1" };

    expect(await fixture.menu.execute("copy-comment", comment)).toBe(true);
    expect(await fixture.menu.execute("google-search", comment)).toBe(true);
    expect(fixture.copied).toEqual(["  検索するコメント  "]);
    expect(fixture.opened).toEqual([
      buildGoogleSearchUrl("  検索するコメント  "),
    ]);

    const directComment = { body: "https://example.com/path", userId: null };
    expect(await fixture.menu.execute("open-comment-url", directComment)).toBe(
      true,
    );
    expect(fixture.opened.at(-1)).toBe("https://example.com/path");
  });

  test("NGワードとNGユーザーIDを追加し、即時反映結果を通知する", async () => {
    const fixture = createFixture();
    const comment = { body: "荒らし.*", userId: "nvc:User" };
    expect(await fixture.menu.execute("add-ng-word", comment)).toBe(true);
    expect(await fixture.menu.execute("add-ng-user", comment)).toBe(true);
    expect(fixture.addedWords).toEqual(["荒らし.*"]);
    expect(fixture.addedUsers).toEqual(["nvc:User"]);
    expect(fixture.notifications.map(({ level }) => level)).toEqual([
      "success",
      "success",
    ]);
  });

  test("不正入力と実行失敗を公式プレイヤーへthrowせず拒否する", async () => {
    const fixture = createFixture({
      writeClipboard: async () => {
        throw new Error("permission denied");
      },
    });
    expect(await fixture.menu.execute("unknown", { body: "test" })).toBe(false);
    expect(await fixture.menu.execute("copy-comment", { body: "test" })).toBe(
      false,
    );
    expect(fixture.notifications.at(-1)).toEqual({
      level: "error",
      message: "コメントメニューの操作に失敗しました: permission denied",
    });
  });
});
