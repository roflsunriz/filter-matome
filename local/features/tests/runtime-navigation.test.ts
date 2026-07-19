import { afterEach, describe, expect, test } from "bun:test";
import {
  addNavigationListener,
  installNavigationMonitor,
  type FilterMatomeNavigationDetail,
} from "@/runtime/navigation";

const originalWindow = globalThis.window;
const originalHistory = globalThis.history;

class FakeWindow extends EventTarget {
  public location = { href: "https://www.nicovideo.jp/watch/sm1" };
  public __filterMatomeNavigationInstalled?: boolean;
}

function installFakeBrowser(): {
  fakeWindow: FakeWindow;
  fakeHistory: History;
} {
  const fakeWindow = new FakeWindow();
  const fakeHistory = {
    pushState: (_data: unknown, _unused: string, url?: string | URL | null) => {
      if (url) fakeWindow.location.href = String(url);
    },
    replaceState: (
      _data: unknown,
      _unused: string,
      url?: string | URL | null,
    ) => {
      if (url) fakeWindow.location.href = String(url);
    },
  } as History;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });
  Object.defineProperty(globalThis, "history", {
    configurable: true,
    value: fakeHistory,
  });
  return { fakeWindow, fakeHistory };
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  });
  Object.defineProperty(globalThis, "history", {
    configurable: true,
    value: originalHistory,
  });
});

describe("centralized navigation monitor", () => {
  test("pushStateを一度だけ共通イベントへ変換する", async () => {
    const { fakeHistory } = installFakeBrowser();
    const details: FilterMatomeNavigationDetail[] = [];
    const removeListener = addNavigationListener((detail) => {
      details.push(detail);
    });

    installNavigationMonitor();
    installNavigationMonitor();
    fakeHistory.pushState(null, "", "https://www.nicovideo.jp/watch/sm2");
    await Promise.resolve();

    expect(details).toEqual([
      {
        previousUrl: "https://www.nicovideo.jp/watch/sm1",
        url: "https://www.nicovideo.jp/watch/sm2",
        source: "pushState",
      },
    ]);
    removeListener();
  });

  test("同じURLへのreplaceStateでは通知しない", async () => {
    const { fakeHistory } = installFakeBrowser();
    let eventCount = 0;
    addNavigationListener(() => {
      eventCount++;
    });
    installNavigationMonitor();

    fakeHistory.replaceState(null, "", "https://www.nicovideo.jp/watch/sm1");
    await Promise.resolve();

    expect(eventCount).toBe(0);
  });
});
