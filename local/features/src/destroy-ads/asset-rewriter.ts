import { shouldBlockAdRequest } from "./ad-request-policy";

export type AssetRewriteKind =
  | "advertisement-component"
  | "ads-resource-loader"
  | "adblock-detector-loader"
  | "google-tag-manager-loader"
  | "legacy-advertisement-manager"
  | "watch-video-ad-orchestration"
  | "html-ad-element";

export interface AssetRewriteResult {
  readonly source: string;
  readonly transformations: readonly AssetRewriteKind[];
}

const ADVERTISEMENT_COMPONENT_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/nvpc_next\/assets\/Advertisement-[^/?]+\.js$/;
const MODERN_ROOT_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/nvpc_next\/assets\/root-[^/?]+\.js$/;
const MODERN_BRIDGE_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/nvpc_next\/assets\/bridge-[^/?]+\.js$/;
const PLAYER_CURRENT_TIME_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/nvpc_next\/assets\/PlayerCurrentTime-[^/?]+\.js$/;
const PLAYER_VOLUME_BAR_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/nvpc_next\/assets\/PlayerVolumeBar-[^/?]+\.js$/;
const LEGACY_PAGE_BUNDLE_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/bundle\/pages_[^/?]+\.js$/;
const NICONICO_HTML_URL = /^https:\/\/(?:[^/]+\.)?nicovideo\.jp\//;

const COMPONENT_EXPORT =
  /export\{([A-Za-z_$][\w$]*) as n,([A-Za-z_$][\w$]*) as r,([A-Za-z_$][\w$]*) as t\};/g;
const ADS_RESOURCE_LOADER =
  /([A-Za-z_$][\w$]*)\([A-Za-z_$][\w$]*\.publicUrl\.adsResource\)/g;
const GTM_LOADER_CALL =
  /[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\.NicoGoogleTagManagerDataLayer,`GTM-[A-Z0-9-]+`\)/g;
const LEGACY_MANAGER_AVAILABILITY =
  /([A-Za-z_$][\w$]*)\.available=!\(!([A-Za-z_$][\w$]*)\(\)\|\|!\2\(\)\.Advertisement\)/g;
const EXTERNAL_ELEMENT =
  /<(script|iframe|video|img|source|link)\b[^>]*(?:src|href|poster)\s*=\s*(["'])((?:https?:)?\/\/[^"']+)\2[^>]*>(?:[\s\S]*?<\/\1\s*>)?/gi;
const WATCH_VIDEO_AD_ENTRY =
  /[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\)\?\.videoAds\?\.\[0\]/g;
const WATCH_VIDEO_AD_PREWARM =
  /[A-Za-z_$][\w$]*\.getPrerollVideoAds\(\)\.at\(0\)/g;
const SNAPSHOT_ADS_RESOURCE_LOADER =
  /[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\.getSnapshot\(\)\.publicUrl\.adsResource\)/g;
const IMA_DETECTOR_LOADER =
  /[A-Za-z_$][\w$]*\(`https:\/\/imasdk\.googleapis\.com\/js\/sdkloader\/ima3\.js`\)/g;
const OPENX_DETECTOR_LOADER =
  /[A-Za-z_$][\w$]*\(`https:\/\/dwango-d\.openx\.net\/w\/1\.0\/jstag`\)/g;

const countMatches = (source: string, pattern: RegExp): number =>
  Array.from(source.matchAll(new RegExp(pattern.source, pattern.flags))).length;

const replaceAndCount = (
  source: string,
  pattern: RegExp,
  replacement: string,
): { source: string; count: number } => {
  let count = 0;
  return {
    source: source.replace(pattern, (...args: unknown[]) => {
      count += 1;
      const match = args[0];
      if (typeof match !== "string") {
        return "";
      }
      return match.replace(pattern, replacement);
    }),
    count,
  };
};

const rewriteHtmlElements = (
  source: string,
): { source: string; count: number } => {
  let count = 0;
  return {
    source: source.replace(EXTERNAL_ELEMENT, (...args: unknown[]) => {
      const element = args[0];
      const url = args[3];
      const absoluteUrl =
        typeof url === "string" && url.startsWith("//") ? `https:${url}` : url;
      if (
        typeof absoluteUrl === "string" &&
        shouldBlockAdRequest(absoluteUrl)
      ) {
        count += 1;
        return "";
      }
      return typeof element === "string" ? element : "";
    }),
    count,
  };
};

export function rewriteOfficialAsset(
  rawUrl: string,
  originalSource: string,
): AssetRewriteResult {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  const normalizedUrl = url.href;
  let source = originalSource;
  const transformations: AssetRewriteKind[] = [];

  if (ADVERTISEMENT_COMPONENT_URL.test(normalizedUrl)) {
    const result = replaceAndCount(
      source,
      COMPONENT_EXPORT,
      "$3=Object.assign(()=>null,{Fallback:()=>null});export{$1 as n,$2 as r,$3 as t};",
    );
    source = result.source;
    if (result.count > 0) transformations.push("advertisement-component");
  }
  if (MODERN_ROOT_URL.test(normalizedUrl)) {
    const result = replaceAndCount(
      source,
      ADS_RESOURCE_LOADER,
      "$1(`/local/features/dist/ad-stub`)",
    );
    source = result.source;
    if (result.count > 0) transformations.push("ads-resource-loader");
  }
  if (MODERN_BRIDGE_URL.test(normalizedUrl)) {
    const result = replaceAndCount(source, GTM_LOADER_CALL, "void 0");
    source = result.source;
    if (result.count > 0) transformations.push("google-tag-manager-loader");
  }
  if (
    PLAYER_CURRENT_TIME_URL.test(normalizedUrl) &&
    countMatches(source, WATCH_VIDEO_AD_ENTRY) === 1 &&
    countMatches(source, WATCH_VIDEO_AD_PREWARM) === 1
  ) {
    source = source
      .replace(WATCH_VIDEO_AD_ENTRY, "void 0/*filter-matome:watch-video-ads*/")
      .replace(
        WATCH_VIDEO_AD_PREWARM,
        "void 0/*filter-matome:watch-video-ads*/",
      );
    transformations.push("watch-video-ad-orchestration");
  }
  if (
    PLAYER_VOLUME_BAR_URL.test(normalizedUrl) &&
    countMatches(source, SNAPSHOT_ADS_RESOURCE_LOADER) === 1 &&
    countMatches(source, IMA_DETECTOR_LOADER) === 1 &&
    countMatches(source, OPENX_DETECTOR_LOADER) === 1
  ) {
    const rejected = "Promise.reject(null)/*filter-matome:adblock-detector*/";
    source = source
      .replace(SNAPSHOT_ADS_RESOURCE_LOADER, rejected)
      .replace(IMA_DETECTOR_LOADER, rejected)
      .replace(OPENX_DETECTOR_LOADER, rejected);
    transformations.push("adblock-detector-loader");
  }
  if (LEGACY_PAGE_BUNDLE_URL.test(normalizedUrl)) {
    const result = replaceAndCount(
      source,
      LEGACY_MANAGER_AVAILABILITY,
      "$1.available=!1",
    );
    source = result.source;
    if (result.count > 0) transformations.push("legacy-advertisement-manager");
  }
  if (NICONICO_HTML_URL.test(normalizedUrl)) {
    const result = rewriteHtmlElements(source);
    source = result.source;
    if (result.count > 0) transformations.push("html-ad-element");
  }

  return { source, transformations };
}

export function detectAppliedAssetRewrites(
  rawUrl: string,
  source: string,
): readonly AssetRewriteKind[] {
  const url = new URL(rawUrl);
  url.search = "";
  url.hash = "";
  const normalizedUrl = url.href;
  const applied: AssetRewriteKind[] = [];

  if (
    ADVERTISEMENT_COMPONENT_URL.test(normalizedUrl) &&
    source.includes("Object.assign(()=>null,{Fallback:()=>null})")
  ) {
    applied.push("advertisement-component");
  }
  if (
    MODERN_ROOT_URL.test(normalizedUrl) &&
    !source.includes(".publicUrl.adsResource") &&
    source.includes("/local/features/dist/ad-stub")
  ) {
    applied.push("ads-resource-loader");
  }
  if (
    MODERN_BRIDGE_URL.test(normalizedUrl) &&
    source.includes("NicoGoogleTagManagerDataLayer") &&
    !source.includes("GTM-KXT7G5G")
  ) {
    applied.push("google-tag-manager-loader");
  }
  if (
    LEGACY_PAGE_BUNDLE_URL.test(normalizedUrl) &&
    source.includes(".available=!1") &&
    source.includes("standaloneAdParams")
  ) {
    applied.push("legacy-advertisement-manager");
  }
  if (
    PLAYER_CURRENT_TIME_URL.test(normalizedUrl) &&
    source.match(/filter-matome:watch-video-ads/gu)?.length === 2
  ) {
    applied.push("watch-video-ad-orchestration");
  }
  if (
    PLAYER_VOLUME_BAR_URL.test(normalizedUrl) &&
    source.match(/filter-matome:adblock-detector/gu)?.length === 3
  ) {
    applied.push("adblock-detector-loader");
  }
  return applied;
}
