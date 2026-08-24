import { shouldBlockAdRequest } from "./ad-request-policy";

export type AssetRewriteKind =
  | "advertisement-component"
  | "ads-resource-loader"
  | "google-tag-manager-loader"
  | "legacy-advertisement-manager"
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
const LEGACY_PAGE_BUNDLE_URL =
  /^https:\/\/resource\.video\.nimg\.jp\/web\/scripts\/bundle\/pages_[^/?]+\.js$/;
const NICONICO_HTML_URL = /^https:\/\/(?:[^/]+\.)?nicovideo\.jp\//;

const COMPONENT_EXPORT =
  /export\{([A-Za-z_$][\w$]*) as n,([A-Za-z_$][\w$]*) as r,([A-Za-z_$][\w$]*) as t\};/g;
const ADS_RESOURCE_LOADER =
  /[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\.publicUrl\.adsResource\)/g;
const GTM_LOADER_CALL =
  /[A-Za-z_$][\w$]*\([A-Za-z_$][\w$]*\.NicoGoogleTagManagerDataLayer,`GTM-[A-Z0-9-]+`\)/g;
const LEGACY_MANAGER_AVAILABILITY =
  /([A-Za-z_$][\w$]*)\.available=!\(!([A-Za-z_$][\w$]*)\(\)\|\|!\2\(\)\.Advertisement\)/g;
const EXTERNAL_ELEMENT =
  /<(script|iframe|video|img|source|link)\b[^>]*(?:src|href|poster)\s*=\s*(["'])((?:https?:)?\/\/[^"']+)\2[^>]*>(?:[\s\S]*?<\/\1\s*>)?/gi;

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
      "Promise.resolve(null)",
    );
    source = result.source;
    if (result.count > 0) transformations.push("ads-resource-loader");
  }
  if (MODERN_BRIDGE_URL.test(normalizedUrl)) {
    const result = replaceAndCount(source, GTM_LOADER_CALL, "void 0");
    source = result.source;
    if (result.count > 0) transformations.push("google-tag-manager-loader");
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
    source.includes("Promise.resolve(null)")
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
  return applied;
}
