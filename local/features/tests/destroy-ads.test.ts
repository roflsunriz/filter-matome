import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getAdBlockReason,
  shouldBlockAdRequest,
} from "@/destroy-ads/ad-request-policy";
import {
  detectAppliedAssetRewrites,
  rewriteOfficialAsset,
} from "@/destroy-ads/asset-rewriter";
import { rewriteProxyPac } from "@/destroy-ads/pac-rewriter";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const extensionSource = readFileSync(
  resolve(repositoryRoot, "extensions", "DestroyAds.java"),
  "utf8",
);

describe("destroy-ads request policy", () => {
  test.each([
    [
      "https://ads.nicovideo.jp/api/video/getAd.json.php",
      "niconico-ad-service",
    ],
    [
      "https://res.ads.nicovideo.jp/assets/images/banner.png",
      "niconico-ad-service",
    ],
    ["https://api.nicoad.nicovideo.jp/v1/nicoad", "niconico-ad-service"],
    [
      "https://securepubads.g.doubleclick.net/gampad/ads",
      "third-party-ad-service",
    ],
    [
      "https://pagead2.googlesyndication.com/pagead/ping",
      "third-party-ad-service",
    ],
    ["https://ad.ad-stir.com/prebid", "third-party-ad-service"],
    [
      "https://web-banner.ads.aps.amazon-adsystem.com/e/dtb/bid",
      "third-party-ad-service",
    ],
    [
      "https://fastlane.rubiconproject.com/a/api/fastlane.json",
      "third-party-ad-service",
    ],
    ["https://grid-bidder.criteo.com/openrtb", "third-party-ad-service"],
    ["https://s-rtb-pb.send.microad.jp/prebid", "third-party-ad-service"],
    [
      "https://imasdk.googleapis.com/js/sdkloader/ima3.js",
      "third-party-ad-service",
    ],
    ["https://www.google.com/pagead/1p-user-list/123/", "niconico-ad-media"],
    [
      "https://s.yimg.jp/images/listing/tool/yads/yads-iframe.html",
      "niconico-ad-media",
    ],
    [
      "https://dcdn.cdn.nimg.jp/nicoad/instream/video/ad.mp4",
      "niconico-ad-media",
    ],
  ] as const)("blocks %s", (url, reason) => {
    expect(getAdBlockReason(url)).toBe(reason);
  });

  test.each([
    "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/Advertisement-version.js",
    "https://dcdn.cdn.nimg.jp/video/movie/segment.m4s",
    "https://nvapi.nicovideo.jp/v1/watch/sm9/access-rights/hls",
    "https://www.nicovideo.jp/watch/sm9",
    "data:text/plain,ad",
    "not a url",
  ])("does not overblock %s", (url) => {
    expect(shouldBlockAdRequest(url)).toBeFalse();
  });
});

describe("destroy-ads official asset rewrites", () => {
  test("replaces the Advertisement component before it creates DOM", () => {
    const result = rewriteOfficialAsset(
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/Advertisement-current.js",
      "var g=makeComponent();export{h as n,m as r,g as t};",
    );
    expect(result.transformations).toEqual(["advertisement-component"]);
    expect(result.source).toContain(
      "g=Object.assign(()=>null,{Fallback:()=>null})",
    );
  });

  test.each(["T(a.publicUrl.adsResource)", "D(a.publicUrl.adsResource)"])(
    "does not load adsResource for minified variant %s",
    (expression) => {
      const result = rewriteOfficialAsset(
        "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/root-current.js",
        `const adsjsPromise=${expression};`,
      );
      expect(result.transformations).toEqual(["ads-resource-loader"]);
      expect(result.source).toBe(
        `const adsjsPromise=${expression[0]}(\`/local/features/dist/ad-stub\`);`,
      );
    },
  );

  test("removes the Watch GTM loader call without touching the data layer", () => {
    const result = rewriteOfficialAsset(
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/bridge-current.js",
      "window[J.NicoGoogleTagManagerDataLayer]=[];Gr(J.NicoGoogleTagManagerDataLayer,`GTM-KXT7G5G`);",
    );
    expect(result.transformations).toEqual(["google-tag-manager-loader"]);
    expect(result.source).toBe(
      "window[J.NicoGoogleTagManagerDataLayer]=[];void 0;",
    );
  });

  test("disables both current Watch video-ad startup paths before getAd", () => {
    const result = rewriteOfficialAsset(
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerCurrentTime-current.js",
      "var q=g(y(e=>{let t=e(K)?.videoAds?.[0];if(t)return load(t)}),[async e=>{let t=e.peek(U);if(await t.isAutoPlayable()){let n=t.getPrerollVideoAds().at(0);n&&warm(n)}}]);",
    );
    expect(result.transformations).toEqual(["watch-video-ad-orchestration"]);
    expect(result.source).not.toContain(".videoAds?.[0]");
    expect(result.source).not.toContain(".getPrerollVideoAds().at(0)");
    expect(result.source.match(/filter-matome:watch-video-ads/gu)).toHaveLength(
      2,
    );
  });

  test("short-circuits all adblock detector script probes", () => {
    const result = rewriteOfficialAsset(
      "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/PlayerVolumeBar-current.js",
      "Promise.allSettled([g(l.getSnapshot().publicUrl.adsResource).then(done),F(`https://imasdk.googleapis.com/js/sdkloader/ima3.js`),F(`https://dwango-d.openx.net/w/1.0/jstag`)]);",
    );
    expect(result.transformations).toEqual(["adblock-detector-loader"]);
    expect(result.source).not.toContain("publicUrl.adsResource");
    expect(result.source).not.toContain("imasdk.googleapis.com");
    expect(result.source).not.toContain("dwango-d.openx.net");
    expect(
      result.source.match(/filter-matome:adblock-detector/gu),
    ).toHaveLength(3);
  });

  test.each([
    "lt.available=!(!at()||!at().Advertisement)",
    "U.available=!(!D()||!D().Advertisement)",
  ])("disables legacy advertisement manager variant %s", (source) => {
    const result = rewriteOfficialAsset(
      "https://resource.video.nimg.jp/web/scripts/bundle/pages_index_TopPage.js",
      source,
    );
    expect(result.transformations).toEqual(["legacy-advertisement-manager"]);
    expect(result.source).toMatch(/\.available=!1$/);
  });

  test("removes ad elements from HTML before browser parsing", () => {
    const result = rewriteOfficialAsset(
      "https://www.nicovideo.jp/watch/sm9",
      '<head><script src="https://ads.nicovideo.jp/ads.js"></script><script src="https://resource.video.nimg.jp/app.js"></script></head>',
    );
    expect(result.transformations).toEqual(["html-ad-element"]);
    expect(result.source).not.toContain("ads.nicovideo.jp");
    expect(result.source).toContain("resource.video.nimg.jp/app.js");
  });

  test("recognizes responses already rewritten by the extension", () => {
    expect(
      detectAppliedAssetRewrites(
        "https://resource.video.nimg.jp/web/scripts/nvpc_next/assets/Advertisement-current.js",
        "var g=Object.assign(()=>null,{Fallback:()=>null});export{h as n,m as r,g as t};",
      ),
    ).toEqual(["advertisement-component"]);
    expect(
      detectAppliedAssetRewrites(
        "https://resource.video.nimg.jp/web/scripts/bundle/pages_index_TopPage.js",
        "lt.available=!1;lt.standaloneAdParams=[];",
      ),
    ).toEqual(["legacy-advertisement-manager"]);
  });
});

describe("DestroyAds NicoCache_nl extension", () => {
  test("rewrites before browser parsing and drops before upstream processing", () => {
    expect(extensionSource).toContain(
      "implements Extension, RequestFilter, Rewriter",
    );
    expect(extensionSource).toContain("Type.RequestFilter1");
    expect(extensionSource).toContain("Type.Rewriter1");
    expect(extensionSource).toContain("RequestFilter.DROP");
    expect(extensionSource).toContain("publicUrl");
    expect(extensionSource).toContain("adsResource");
    expect(extensionSource).toContain("NicoGoogleTagManagerDataLayer");
    expect(extensionSource).toContain("filter-matome:watch-video-ads");
    expect(extensionSource).toContain("filter-matome:adblock-detector");
    expect(extensionSource).not.toMatch(
      /MutationObserver|querySelector|style\.display|classList/gu,
    );
  });

  test("is a single distributable class", () => {
    expect(extensionSource.match(/\bclass\s+[A-Za-z]/gu)).toHaveLength(1);
    expect(extensionSource.split(/\r?\n/u).length - 1).toBeLessThanOrEqual(
      1000,
    );
    expect(
      existsSync(resolve(repositoryRoot, "extensions", "DestroyAds.class")),
    ).toBeTrue();
  });
});

describe("destroy-ads PAC route", () => {
  const basePac = `function FindProxyForURL(url, host) {
  if (shExpMatch(host, '*.nicovideo.jp')) {
    return 'PROXY 127.0.0.1:8080';
  };
  return 'DIRECT';
}
`;

  test("routes only managed ad hosts to the existing NicoCache proxy", () => {
    const result = rewriteProxyPac(basePac);
    expect(result.changed).toBeTrue();
    expect(result.source).toContain(
      "dnsDomainIs(destroyAdsHost, '.doubleclick.net')",
    );
    expect(result.source).toContain("destroyAdsHost === 'ads.nicovideo.jp'");
    expect(result.source).toContain("return 'PROXY 127.0.0.1:8080';");
    expect(result.source).toContain("return 'DIRECT';");
  });

  test("is idempotent, accepts earlier DIRECT, and rejects an unsafe tail", () => {
    const first = rewriteProxyPac(basePac);
    const second = rewriteProxyPac(first.source);
    expect(second.changed).toBeFalse();
    expect(() => rewriteProxyPac("return 'DIRECT';")).toThrow(
      "proxy.pacからNicoCache_nlのproxy指定を取得できません",
    );
    expect(
      rewriteProxyPac(
        "function FindProxyForURL(){\n  return 'PROXY 127.0.0.1:8080';\n  if (host === 'direct.example') {\n  return 'DIRECT';\n  };\n  return 'DIRECT';\n}\n",
      ).changed,
    ).toBeTrue();
    expect(() =>
      rewriteProxyPac(
        "return 'PROXY 127.0.0.1:8080';\n  return 'DIRECT';\nnot-the-end",
      ),
    ).toThrow("proxy.pacの最終DIRECTを安全に特定できません");
  });
});
