import { expect, test, type Route } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..");

interface LinkManagerProbe {
  getLinks(group: "custom"): Promise<
    Array<{
      id: string;
      title: string;
      action: string;
      disabled?: boolean;
    }>
  >;
  handleAction(action: string): Promise<void>;
}

interface LinksTabControllerProbe {
  renderLinkGroup(group: "custom"): Promise<string>;
  bind(): void;
}

function buildTestDocument(body: string): string {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>links fixture</title></head><body>${body}</body></html>`;
}

async function fulfillTestDocument(route: Route, body: string): Promise<void> {
  await route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: buildTestDocument(body),
  });
}

function buildControllerBundle(): string {
  const directory = mkdtempSync(join(tmpdir(), "filter-matome-links-test-"));
  const output = join(directory, "controller.js");
  try {
    execFileSync("bun", ["scripts/build-playwright-fixture.ts", output], {
      cwd: projectRoot,
      stdio: "pipe",
    });
    return readFileSync(output, "utf8");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("filter-matome専用リンクから現在の動画をsmartFetcherへ渡す", async ({
  page,
}) => {
  await page.route("https://www.nicovideo.jp/watch/sm9", (route) =>
    fulfillTestDocument(route, '<div id="watch-fixture"></div>'),
  );
  await page.goto("https://www.nicovideo.jp/watch/sm9");
  await page.addScriptTag({ content: buildControllerBundle() });

  const result = await page.evaluate(async () => {
    const openedUrls: string[] = [];
    Object.assign(window, {
      commonHelper: { getVideoIdWithFallback: async () => "sm9" },
      logger: {
        warn: () => {},
        error: () => {},
        info: () => {},
        debug: () => {},
      },
    });
    Object.defineProperty(window, "open", {
      configurable: true,
      value: (url?: string | URL) => {
        openedUrls.push(String(url));
        return null;
      },
    });

    const registry = (
      window as unknown as {
        MlinkTabControllers: {
          LinkManager: { getInstance(): LinkManagerProbe };
          LinksTabController: new (
            root: ShadowRoot,
            manager: LinkManagerProbe,
          ) => LinksTabControllerProbe;
        };
      }
    ).MlinkTabControllers;
    const linkManager = registry.LinkManager.getInstance();
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const controller = new registry.LinksTabController(shadow, linkManager);
    shadow.innerHTML = await controller.renderLinkGroup("custom");
    controller.bind();
    const card = shadow.querySelector<HTMLElement>(
      '[data-action="smart-fetcher"]',
    );
    card?.click();
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    return {
      action: card?.dataset.action,
      disabled: card?.dataset.disabled,
      title: card?.querySelector("span")?.textContent,
      openedUrls,
    };
  });

  expect(result.action).toBe("smart-fetcher");
  expect(result.title).toBe("smartFetcher");
  expect(result.disabled).toBeUndefined();
  expect(result.openedUrls).toEqual([
    "https://www.nicovideo.jp/local/features/dist/pages/movie-fetcher/index.html?videoId=sm9",
  ]);
});
