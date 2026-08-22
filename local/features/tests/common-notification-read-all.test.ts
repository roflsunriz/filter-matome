import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectUnreadNotificationIds,
  markAllNotificationsRead,
  NotificationReadAllError,
} from "@/common/notification-read-all";

type Fixture = {
  pages: unknown[];
};

const fixture = JSON.parse(
  readFileSync(
    join(import.meta.dirname, "fixtures", "common-header-notifications.json"),
    "utf8",
  ),
) as Fixture;

const jsonResponse = (value: unknown, status = 200): Response =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const getUrl = (input: RequestInfo | URL): URL => {
  if (input instanceof Request) {
    return new URL(input.url);
  }
  return new URL(String(input));
};

describe("CommonHeader通知の一括既読", () => {
  test("nextUrlを最後までたどり、未読IDだけを重複なく制限付き並列で既読にする", async () => {
    const calls: Array<{ method: string; url: URL; init?: RequestInit }> = [];
    let activeWrites = 0;
    let maxActiveWrites = 0;

    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = getUrl(input);
      const method = init?.method ?? "GET";
      calls.push({ method, url, init });

      if (method === "GET") {
        const offset = url.searchParams.get("offset");
        return jsonResponse(
          offset === "25" ? fixture.pages[1] : fixture.pages[0],
        );
      }

      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      await new Promise((resolve) => setTimeout(resolve, 5));
      activeWrites -= 1;
      return jsonResponse({ meta: { status: 200 }, data: {} });
    };

    const result = await markAllNotificationsRead({
      fetcher,
      frontendId: "135",
      requestUrl: "https://www.nicovideo.jp/watch/sm9",
      concurrency: 2,
    });

    expect(result).toEqual({
      unreadCount: 3,
      succeededCount: 3,
      failedIds: [],
    });
    expect(maxActiveWrites).toBeLessThanOrEqual(2);

    const getCalls = calls.filter((call) => call.method === "GET");
    expect(getCalls).toHaveLength(2);
    expect(getCalls[0]?.url.searchParams.get("importantOnly")).toBe("false");
    expect(getCalls[1]?.url.searchParams.get("offset")).toBe("25");

    const putCalls = calls.filter((call) => call.method === "PUT");
    expect(putCalls.map((call) => call.url.pathname).sort()).toEqual([
      "/v1/notifications/1004/read",
      "/v1/notifications/notice-unread-1/read",
      "/v1/notifications/notice-unread-2/read",
    ]);
    expect(
      putCalls.every(
        (call) =>
          call.init?.credentials === "include" &&
          new Headers(call.init.headers).get("X-Frontend-Id") === "135" &&
          new Headers(call.init.headers).get("X-Request-With") ===
            "https://www.nicovideo.jp/watch/sm9",
      ),
    ).toBe(true);
  });

  test("nextUrlが公式API外を指す場合はPUTを1件も送らず停止する", async () => {
    let putCount = 0;
    const fetcher = async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      if (init?.method === "PUT") {
        putCount += 1;
      }
      return jsonResponse({
        data: {
          notifications: [{ id: "notice-unread", read: false }],
          nextUrl: "https://example.invalid/v1/box?offset=25",
        },
      });
    };

    await expect(
      collectUnreadNotificationIds({ fetcher }),
    ).rejects.toBeInstanceOf(NotificationReadAllError);
    expect(putCount).toBe(0);
  });

  test("個別PUTの失敗を成功扱いせず再試行対象として返す", async () => {
    const fetcher = async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = getUrl(input);
      if (init?.method !== "PUT") {
        return jsonResponse({
          data: {
            notifications: [
              { id: "notice-ok", read: false },
              { id: "notice-failure", read: false },
            ],
            nextUrl: null,
          },
        });
      }
      return url.pathname.includes("notice-failure")
        ? jsonResponse({ message: "temporary failure" }, 500)
        : jsonResponse({ data: {} });
    };

    const result = await markAllNotificationsRead({ fetcher });
    expect(result.unreadCount).toBe(2);
    expect(result.succeededCount).toBe(1);
    expect(result.failedIds).toEqual(["notice-failure"]);
  });
});
