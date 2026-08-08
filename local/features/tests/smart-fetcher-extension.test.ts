import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const schedulerPath = resolve(
  repositoryRoot,
  "extensions",
  "FilterMatomeSmartFetcher.java",
);
const fetcherPath = resolve(
  repositoryRoot,
  "extensions",
  "nlMovieFetcher.java",
);
const scheduler = readFileSync(schedulerPath, "utf8");
const fetcher = readFileSync(fetcherPath, "utf8");
const schedulerClient = readFileSync(
  resolve(
    repositoryRoot,
    "local",
    "features",
    "src",
    "movie-fetcher",
    "scheduler-client.ts",
  ),
  "utf8",
);
const schedulerApp = readFileSync(
  resolve(
    repositoryRoot,
    "local",
    "features",
    "src",
    "movie-fetcher",
    "scheduler-app.ts",
  ),
  "utf8",
);

describe("smartFetcher Java extension contract", () => {
  test("各拡張を単一classかつ1000行以下に保つ", () => {
    expect(scheduler.split(/\r?\n/u).length - 1).toBeLessThanOrEqual(1000);
    expect(fetcher.split(/\r?\n/u).length - 1).toBeLessThanOrEqual(1000);
    expect(scheduler.match(/\bclass\s+[A-Za-z]/gu)).toHaveLength(1);
    expect(fetcher.match(/\bclass\s+[A-Za-z]/gu)).toHaveLength(1);
  });

  test("Cookieを限定してAES-GCM暗号化し状態APIへ平文を出さない", () => {
    expect(scheduler).toContain("AES/GCM/NoPadding");
    expect(scheduler).toContain(
      "nicosid|domand_bid|user_session|user_session_secure",
    );
    expect(scheduler).toContain("restrictPermissions");
    expect(scheduler).toContain("append(!encryptedCookie.isEmpty())");
    expect(scheduler).not.toMatch(/append\([^\n]*decryptCookie/gu);
    expect(fetcher).toContain('if (!"domand_bid".equals(name))');
  });

  test("周期実行、永続復旧、容量拒否、再試行、祝日、帯域制限を接続する", () => {
    expect(scheduler).toContain("PERIODIC_CALL");
    expect(scheduler).toContain("recoverInterruptedSchedules");
    expect(scheduler).toContain('"capacity-rejected"');
    expect(scheduler).toContain('"maxRetries"');
    expect(scheduler).toContain("japaneseHolidays");
    expect(scheduler).toContain("recomputeAdmission");
    expect(scheduler).toContain("requestWatchPage");
    expect(scheduler).toContain("SERVER_RESPONSE");
    expect(scheduler).toContain("hasDueSchedule");
    expect(scheduler).toContain("取得結果が不完全です");
    expect(fetcher).toContain("maxBytesPerSecond");
    expect(fetcher).toContain("bytesTransferred");
    expect(fetcher).toContain("throttle(total");
  });

  test("現行Domand配信に不要な互換URLと状態時刻を持たない", () => {
    expect(fetcher).toContain('"delivery.domand.nicovideo.jp".equals(host)');
    expect(fetcher).toContain("CURRENT_CMAF_RESOURCE_PATH");
    expect(fetcher).not.toContain("asset.domand.nicovideo.jp");
    expect(fetcher).not.toContain('path.matches("/[a-f0-9]{24}/.*")');
    expect(fetcher).not.toContain("startedAts");
    expect(fetcher).not.toContain("finishedAts");
  });

  test("NicoCacheの限定cache playlistを許可しSPAの古い応答を破棄する", () => {
    expect(fetcher).toContain("(?:master|audio|video)\\\\.m3u8");
    expect(fetcher).toContain("[A-Za-z0-9._~,=-]{1,256}");
    expect(fetcher).toContain('"delivery.domand.nicovideo.jp".equals(host)');
    expect(schedulerClient.match(/cache: "no-store"/gu)).toHaveLength(3);
    expect(schedulerApp).toContain("stateRequestGeneration");
    expect(schedulerApp).toContain("generation === stateRequestGeneration");
  });
});
