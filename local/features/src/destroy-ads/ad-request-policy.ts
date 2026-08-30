export type AdBlockReason =
  "niconico-ad-service" | "third-party-ad-service" | "niconico-ad-media";

export const EXACT_NICONICO_AD_HOSTS = [
  "ads.nicovideo.jp",
  "api.nicoad.nicovideo.jp",
] as const;

export const EXACT_THIRD_PARTY_AD_HOSTS = [
  "analytics.twitter.com",
  "analytics.tiktok.com",
  "analytics-ipv6.tiktokw.us",
  "imasdk.googleapis.com",
  "static.ads-twitter.com",
  "tag.flvcdn.net",
] as const;

export const AD_HOST_SUFFIXES = [
  ".ads.nicovideo.jp",
  ".doubleclick.net",
  ".googlesyndication.com",
  ".googletagmanager.com",
  ".googleadservices.com",
  ".ad-stir.com",
  ".adtdp.com",
  ".pubmatic.com",
  ".amazon-adsystem.com",
  ".adtrafficquality.google",
  ".impact-ad.jp",
  ".im-apps.net",
  ".socdm.com",
  ".rubiconproject.com",
  ".ad-delivery.net",
  ".microad.jp",
  ".adnxs.com",
  ".media.net",
  ".adingo.jp",
  ".casalemedia.com",
  ".criteo.com",
  ".openx.net",
  ".indexww.com",
  ".ladsp.com",
  ".i-mobile.co.jp",
  ".genieesspv.jp",
  ".gsspcln.jp",
  ".id5-sync.com",
  ".gmossp-sp.jp",
  ".creativecdn.com",
  ".slim02.jp",
  ".crwdcntrl.net",
  ".rlcdn.com",
  ".2mdn.net",
] as const;

export const SPECIAL_MEDIA_PATH_RULES = [
  ["dcdn.cdn.nimg.jp", ["/nicoad/instream/"]],
  ["secure-dcdn.cdn.nimg.jp", ["/nicoad/"]],
  ["www.google.com", ["/pagead/", "/ccm/"]],
  ["www.google.co.jp", ["/pagead/", "/ccm/"]],
  ["s.yimg.jp", ["/images/listing/tool/cv/", "/images/listing/tool/yads/"]],
  ["apm.yahoo.co.jp", ["/"]],
  ["b99.yahoo.co.jp", ["/"]],
  ["cksync.yahoo.co.jp", ["/"]],
  ["yads.c.yimg.jp", ["/"]],
  ["yads.yjtag.yahoo.co.jp", ["/"]],
] as const;

const exactNiconicoAdHosts = new Set<string>(EXACT_NICONICO_AD_HOSTS);
const exactThirdPartyAdHosts = new Set<string>(EXACT_THIRD_PARTY_AD_HOSTS);
const specialMediaPaths = new Map<string, readonly string[]>(
  SPECIAL_MEDIA_PATH_RULES,
);

const normalizeHostname = (hostname: string): string =>
  hostname.toLowerCase().replace(/\.$/, "");

export function getAdBlockReason(value: string | URL): AdBlockReason | null {
  let url: URL;
  try {
    url = value instanceof URL ? value : new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const hostname = normalizeHostname(url.hostname);
  if (
    exactNiconicoAdHosts.has(hostname) ||
    hostname.endsWith(".ads.nicovideo.jp")
  ) {
    return "niconico-ad-service";
  }
  if (
    exactThirdPartyAdHosts.has(hostname) ||
    AD_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  ) {
    return "third-party-ad-service";
  }
  const prefixes = specialMediaPaths.get(hostname);
  if (prefixes?.some((prefix) => url.pathname.startsWith(prefix))) {
    return "niconico-ad-media";
  }
  return null;
}

export const shouldBlockAdRequest = (value: string | URL): boolean =>
  getAdBlockReason(value) !== null;
