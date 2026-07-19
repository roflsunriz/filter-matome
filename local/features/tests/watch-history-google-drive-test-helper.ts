import { expect, type Page } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

/** Google Drive APIを置き換え、watch-historyのZIP入出力を一巡検証する。 */
export async function verifyWatchHistoryGoogleDriveBackup(
  page: Page,
  seedEntry: Record<string, unknown>,
  exportedAt: number,
): Promise<void> {
  const zippedBackup = Buffer.from(
    zipSync({
      "NicoWatchHistory_test.json": strToU8(
        JSON.stringify({
          version: "3.0.0",
          exportedAt,
          entries: [
            {
              ...seedEntry,
              videoId: "sm998",
              title: "Google Driveインポート動画",
            },
          ],
          seriesAlerts: [],
        }),
      ),
    }),
  );
  let uploadedBody = "";

  await page.route("https://www.googleapis.com/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const query = decodeURIComponent(url.searchParams.get("q") ?? "");

    if (url.pathname === "/drive/v3/files" && query.includes("name =")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          files: [{ id: "watch-folder", name: "Watch History Backups" }],
        }),
      });
      return;
    }
    if (url.pathname === "/upload/drive/v3/files") {
      uploadedBody = request.postDataBuffer()?.toString("latin1") ?? "";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ id: "uploaded-watch-backup" }),
      });
      return;
    }
    if (
      url.pathname === "/drive/v3/files" &&
      query.includes("'watch-folder' in parents")
    ) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          files: [
            {
              id: "watch-backup",
              name: "NicoWatchHistory_test.zip",
              modifiedTime: "2026-07-20T00:00:00.000Z",
            },
            {
              id: "mylist-backup",
              name: "Mylist2_test.zip",
              modifiedTime: "2026-07-21T00:00:00.000Z",
            },
          ],
        }),
      });
      return;
    }
    if (url.pathname === "/drive/v3/files/watch-backup") {
      await route.fulfill({
        contentType: "application/zip",
        body: zippedBackup,
      });
      return;
    }
    await route.abort();
  });
  await page.evaluate(() => {
    const google = {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            callback: (response: {
              access_token: string;
              expires_in: number;
            }) => void;
          }) => ({
            requestAccessToken: () =>
              config.callback({
                access_token: "watch-history-test-token",
                expires_in: 3600,
              }),
          }),
        },
      },
    };
    Object.assign(window, { google });
  });

  await page.locator(".management-menu summary").click();
  await page.locator("#google-drive-export-btn").click();
  await expect(page.locator("#toast-container")).toContainText(
    "Google Driveへバックアップを保存しました",
  );
  expect(uploadedBody).toContain("NicoWatchHistory_");
  expect(uploadedBody).toContain(".zip");

  await page.locator(".management-menu summary").click();
  await page.locator("#google-drive-import-btn").click();
  await expect(page.locator("#google-drive-import-modal")).toBeVisible();
  await expect(page.locator("#google-drive-backup-select option")).toHaveCount(
    1,
  );
  await expect(page.locator("#google-drive-backup-select")).toContainText(
    "NicoWatchHistory_test.zip",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#google-drive-import-confirm").click();
  await expect(
    page.locator('.history-item[data-video-id="sm998"]'),
  ).toHaveCount(1);
  await expect(page.locator("#toast-container")).toContainText(
    "1件の履歴と0件のシリーズアラートをインポートしました",
  );
}
