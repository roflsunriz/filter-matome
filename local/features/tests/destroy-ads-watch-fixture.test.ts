import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { shouldBlockAdRequest } from "@/destroy-ads/ad-request-policy";
import { rewriteOfficialAsset } from "@/destroy-ads/asset-rewriter";

import { DESTROY_ADS_WATCH_FIXTURE } from "./fixtures/destroy-ads-watch";

const repositoryRoot = resolve(import.meta.dirname, "..", "..", "..");
const extensionSource = readFileSync(
  resolve(repositoryRoot, "extensions", "DestroyAds.java"),
  "utf8",
);
const extensionClass = readFileSync(
  resolve(repositoryRoot, "extensions", "DestroyAds.class"),
);

describe("destroy-ads official Watch fixture", () => {
  test("広告コンポーネントの公開bindingを描画不能な実装へ置き換える", () => {
    const fixture = DESTROY_ADS_WATCH_FIXTURE.assets.advertisement;
    expect(fixture.source).toContain("new S.Advertisement");
    expect(fixture.source).toContain("export{h as n,m as r,g as t}");

    const result = rewriteOfficialAsset(fixture.url, fixture.source);

    expect(result.transformations).toEqual(["advertisement-component"]);
    expect(result.source).toContain(
      "g=Object.assign(()=>null,{Fallback:()=>null})",
    );
    expect(result.source).toContain("export{h as n,m as r,g as t}");
    expect(result.source.lastIndexOf("g=Object.assign")).toBeGreaterThan(
      result.source.indexOf("new S.Advertisement"),
    );
  });

  test("adsResourceローダー関数を保ち、同一originの空stubだけを読ませる", () => {
    const fixture = DESTROY_ADS_WATCH_FIXTURE.assets.root;
    const beforeCall = fixture.source.match(
      /([A-Za-z_$][\w$]*)\([A-Za-z_$][\w$]*\.publicUrl\.adsResource\)/u,
    );
    expect(beforeCall).not.toBeNull();

    const result = rewriteOfficialAsset(fixture.url, fixture.source);
    const afterCall = result.source.match(
      /([A-Za-z_$][\w$]*)\(`\/local\/features\/dist\/ad-stub`\)/u,
    );

    expect(result.transformations).toEqual(["ads-resource-loader"]);
    expect(afterCall?.[1]).toBe(beforeCall?.[1]);
    expect(result.source).not.toContain("publicUrl.adsResource");
  });

  test("広告ブロック検査の3通信だけをallSettled内のrejectへ変える", () => {
    const fixture = DESTROY_ADS_WATCH_FIXTURE.assets.playerVolumeBar;
    expect(fixture.source).toContain("Promise.allSettled");

    const result = rewriteOfficialAsset(fixture.url, fixture.source);

    expect(result.transformations).toEqual(["adblock-detector-loader"]);
    expect(result.source).toContain("Promise.allSettled");
    expect(result.source).not.toContain("publicUrl.adsResource");
    expect(result.source).not.toContain("imasdk.googleapis.com");
    expect(result.source).not.toContain("dwango-d.openx.net");
    expect(
      result.source.match(/filter-matome:adblock-detector/gu),
    ).toHaveLength(3);
  });

  test("PlayerCurrentTimeの初期化・再生開始シーケンスを完全に保持する", () => {
    const fixture = DESTROY_ADS_WATCH_FIXTURE.assets.playerCurrentTime;
    expect(fixture.source).toContain("?.videoAds?.[0]");
    expect(fixture.source).toContain(".getPrerollVideoAds().at(0)");
    expect(fixture.source).toContain("await Promise.resolve(e(q))");

    const result = rewriteOfficialAsset(fixture.url, fixture.source);

    expect(result.transformations).toEqual([]);
    expect(result.source).toBe(fixture.source);
    expect(extensionSource).not.toContain("PlayerCurrentTime");
    expect(
      extensionClass.includes(Buffer.from("PlayerCurrentTime")),
    ).toBeFalse();
  });

  test.each(DESTROY_ADS_WATCH_FIXTURE.requests)(
    "$role を $expected",
    ({ url, expected }) => {
      expect(shouldBlockAdRequest(url)).toBe(expected === "block");
    },
  );
});
