import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";

import {
  AD_HOST_SUFFIXES,
  EXACT_NICONICO_AD_HOSTS,
  EXACT_THIRD_PARTY_AD_HOSTS,
  SPECIAL_MEDIA_PATH_RULES,
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
      "implements Extension2, RequestFilter, Rewriter",
    );
    expect(extensionSource).toContain("manager.registerRequestFilter(this)");
    expect(extensionSource).toContain("manager.registerRewriter(this)");
    expect(extensionSource).toContain(
      'NLMain.getExtLogger(\n                    this, "DestroyAds", null, true)',
    );
    expect(extensionSource).toContain("RequestFilter.DROP");
    expect(extensionSource).toContain("publicUrl");
    expect(extensionSource).toContain("adsResource");
    expect(extensionSource).toContain("NicoGoogleTagManagerDataLayer");
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

  test("uses every canonical PAC rule in the distributable Java extension", () => {
    for (const value of [
      ...EXACT_NICONICO_AD_HOSTS,
      ...EXACT_THIRD_PARTY_AD_HOSTS,
      ...AD_HOST_SUFFIXES,
      ...SPECIAL_MEDIA_PATH_RULES.flatMap(([host, prefixes]) => [
        host,
        ...prefixes,
      ]),
    ]) {
      expect(extensionSource).toContain(`"${value}"`);
    }
    expect(extensionSource).toContain(
      'appendPacArray(block, "destroyAdsExactHosts", EXACT_AD_HOSTS)',
    );
    expect(extensionSource).toContain("appendPacPathRules(block)");
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

  const loadPac = (source: string) => {
    const context = createContext({
      dnsDomainIs: (host: string, suffix: string) => host.endsWith(suffix),
      shExpMatch: (host: string, pattern: string) =>
        pattern.startsWith("*.")
          ? host.endsWith(pattern.slice(1))
          : host === pattern,
    });
    runInContext(source, context, { filename: "proxy.pac" });
    return (url: string, host: string): string => {
      context.url = url;
      context.host = host;
      return runInContext("FindProxyForURL(url, host)", context) as string;
    };
  };

  test("routes only managed ad hosts to the existing NicoCache proxy", () => {
    const result = rewriteProxyPac(basePac);
    expect(result.changed).toBeTrue();
    expect(result.source).toContain("return 'PROXY 127.0.0.1:8080';");
    expect(result.source).toContain("return 'DIRECT';");

    const findProxy = loadPac(result.source);
    for (const host of [
      ...EXACT_NICONICO_AD_HOSTS,
      ...EXACT_THIRD_PARTY_AD_HOSTS,
    ]) {
      expect(findProxy(`https://${host}/probe`, host)).toBe(
        "PROXY 127.0.0.1:8080",
      );
      expect(findProxy(`https://${host}./probe`, `${host}.`)).toBe(
        "PROXY 127.0.0.1:8080",
      );
    }
    for (const suffix of AD_HOST_SUFFIXES) {
      const host = `probe${suffix}`;
      expect(findProxy(`https://${host}/probe`, host)).toBe(
        "PROXY 127.0.0.1:8080",
      );
    }
    for (const [host, prefixes] of SPECIAL_MEDIA_PATH_RULES) {
      for (const prefix of prefixes) {
        expect(findProxy(`https://${host}${prefix}probe`, host)).toBe(
          "PROXY 127.0.0.1:8080",
        );
      }
    }

    expect(findProxy("https://example.com/", "example.com")).toBe("DIRECT");
    expect(
      findProxy("https://dcdn.cdn.nimg.jp/not-nicoad/", "dcdn.cdn.nimg.jp"),
    ).toBe("DIRECT");
    expect(
      findProxy("https://www.google.com/not-pagead/", "www.google.com"),
    ).toBe("DIRECT");
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
