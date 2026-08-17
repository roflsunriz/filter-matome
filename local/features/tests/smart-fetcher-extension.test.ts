import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
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
const features = readFileSync(
  resolve(repositoryRoot, "local", "features", "src", "features.ts"),
  "utf8",
);
const buildScript = readFileSync(
  resolve(repositoryRoot, "local", "features", "scripts", "build.ts"),
  "utf8",
);

describe("smartFetcher Java extension contract", () => {
  test("全Java拡張が単なる読込完了をinfoログへ出さない", () => {
    const extensionDirectory = resolve(repositoryRoot, "extensions");
    const sources = readdirSync(extensionDirectory)
      .filter((name) => name.endsWith(".java"))
      .map((name) => readFileSync(resolve(extensionDirectory, name), "utf8"));
    for (const source of sources) {
      expect(source).not.toMatch(/(?:拡張|extension).{0,20}読み込みました/iu);
      expect(source).not.toMatch(/(?:extension).{0,20}(?:loaded)/iu);
    }
  });

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
    expect(fetcher).toContain("hasCompletedCache(videoId)");
    expect(fetcher).toContain("new Cache(video).exists()");
  });

  test("取得履歴の個別・一括削除は履歴だけを永続化する", () => {
    expect(scheduler).toContain("remove-history|clear-history");
    expect(scheduler).toContain("private void removeHistory");
    expect(scheduler).toContain("private void clearHistory");
    const removeHistory = scheduler.match(
      /private void removeHistory\([^\n]+/u,
    )?.[0];
    const clearHistory = scheduler.match(
      /private void clearHistory\([^\n]+/u,
    )?.[0];
    expect(removeHistory).toContain("history.removeIf");
    expect(clearHistory).toContain("history.clear()");
    expect(removeHistory).not.toContain("schedules");
    expect(clearHistory).not.toContain("schedules");
  });

  test("実測したDomand配信URLだけを用途別に許可する", () => {
    expect(fetcher).toContain('"delivery.domand.nicovideo.jp".equals(host)');
    expect(fetcher).toContain("LOCAL_CMAF_RESOURCE_PATH");
    expect(fetcher).toContain("ASSET_CMAF_RESOURCE_PATH");
    expect(fetcher).toContain('"nicocachenl.test".equals(host)');
    expect(fetcher).toContain('"asset.domand.nicovideo.jp".equals(host)');
    expect(fetcher).toContain("isAllowedMasterPlaylistUrl(contentUrl)");
    expect(fetcher).toContain("[a-f0-9]{24}");
    expect(fetcher).toContain("uri.getUserInfo() == null");
    expect(fetcher).not.toContain('path.matches("/[a-f0-9]{24}/.*")');
    expect(fetcher).not.toContain("startedAts");
    expect(fetcher).not.toContain("finishedAts");
  });

  test("NicoCacheの限定media playlistを許可しSPAの古い応答を破棄する", () => {
    expect(fetcher).toContain("(?:master|audio|video)\\\\.m3u8");
    expect(fetcher).toContain("/media/v1/playback-sessions/");
    expect(fetcher).not.toContain("/cache/file/");
    expect(schedulerClient.match(/cache: "no-store"/gu)).toHaveLength(3);
    expect(schedulerApp).toContain("stateRequestGeneration");
    expect(schedulerApp).toContain("generation === stateRequestGeneration");
  });

  test("access-rights通信をNicoCacheプロキシーへ通してキャッシュ対象を登録する", () => {
    const requestJson = scheduler.match(
      /private JsonObject requestJson[\s\S]+?private JsonObject requestWatchPage/u,
    )?.[0];
    expect(requestJson).toBeDefined();
    expect(requestJson).toContain("new Proxy(Proxy.Type.HTTP");
    expect(requestJson).toContain("new URL(url).openConnection(proxy)");
    expect(requestJson).toContain("nlMovieFetcher.getProxyTlsSocketFactory()");
    expect(requestJson).not.toContain("openConnection(Proxy.NO_PROXY)");
    expect(scheduler).toContain(
      "NicoCachingTitleRetriever.putTitleCache(videoId",
    );
  });

  test("リリース番号でbootstrapと遅延entryのブラウザーキャッシュを更新する", () => {
    expect(buildScript).toContain("features.js?v=");
    expect(features).toContain("?v=${FILTER_MATOME_VERSION}");
  });
});
