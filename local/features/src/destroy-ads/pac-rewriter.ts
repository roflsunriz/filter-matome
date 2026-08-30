import {
  AD_HOST_SUFFIXES,
  EXACT_NICONICO_AD_HOSTS,
  EXACT_THIRD_PARTY_AD_HOSTS,
  SPECIAL_MEDIA_PATH_RULES,
} from "./ad-request-policy";

export const DESTROY_ADS_PAC_START =
  "  // filter-matome destroy-ads: managed block start";
export const DESTROY_ADS_PAC_END =
  "  // filter-matome destroy-ads: managed block end";

const DIRECT_RETURN = "  return 'DIRECT';";
const PROXY_PATTERN = /PROXY\s+127\.0\.0\.1:\d+/;

const pacArray = (values: readonly string[]): string =>
  JSON.stringify(values, null, 2).replace(/\n/gu, "\n  ");

const pacPathRules = (): string =>
  `[\n${SPECIAL_MEDIA_PATH_RULES.map(
    ([host, prefixes]) =>
      `    [${JSON.stringify(host)}, ${JSON.stringify(prefixes)}]`,
  ).join(",\n")}\n  ]`;

export const createDestroyAdsPacBlock = (proxy: string): string =>
  `${DESTROY_ADS_PAC_START}
  var destroyAdsHost = host.toLowerCase();
  if (destroyAdsHost.charAt(destroyAdsHost.length - 1) === '.') {
    destroyAdsHost = destroyAdsHost.substring(0, destroyAdsHost.length - 1);
  }
  var destroyAdsUrl = url.toLowerCase();
  var destroyAdsExactHosts = ${pacArray([
    ...EXACT_NICONICO_AD_HOSTS,
    ...EXACT_THIRD_PARTY_AD_HOSTS,
  ])};
  var destroyAdsHostSuffixes = ${pacArray(AD_HOST_SUFFIXES)};
  var destroyAdsPathRules = ${pacPathRules()};
  var destroyAdsMatched = false;
  var destroyAdsIndex;

  for (destroyAdsIndex = 0;
       destroyAdsIndex < destroyAdsExactHosts.length;
       destroyAdsIndex++) {
    if (destroyAdsHost === destroyAdsExactHosts[destroyAdsIndex]) {
      destroyAdsMatched = true;
      break;
    }
  }

  if (!destroyAdsMatched) {
    for (destroyAdsIndex = 0;
         destroyAdsIndex < destroyAdsHostSuffixes.length;
         destroyAdsIndex++) {
      if (dnsDomainIs(
          destroyAdsHost,
          destroyAdsHostSuffixes[destroyAdsIndex]
      )) {
        destroyAdsMatched = true;
        break;
      }
    }
  }

  if (!destroyAdsMatched) {
    var destroyAdsPathStart = destroyAdsUrl.indexOf('://');
    destroyAdsPathStart = destroyAdsUrl.indexOf('/', destroyAdsPathStart + 3);
    var destroyAdsPath = destroyAdsPathStart >= 0
      ? destroyAdsUrl.substring(destroyAdsPathStart)
      : '/';
    for (destroyAdsIndex = 0;
         destroyAdsIndex < destroyAdsPathRules.length;
         destroyAdsIndex++) {
      var destroyAdsRule = destroyAdsPathRules[destroyAdsIndex];
      if (destroyAdsHost !== destroyAdsRule[0]) {
        continue;
      }
      for (var destroyAdsPrefixIndex = 0;
           destroyAdsPrefixIndex < destroyAdsRule[1].length;
           destroyAdsPrefixIndex++) {
        if (destroyAdsPath.indexOf(
            destroyAdsRule[1][destroyAdsPrefixIndex]
        ) === 0) {
          destroyAdsMatched = true;
          break;
        }
      }
      if (destroyAdsMatched) {
        break;
      }
    }
  }

  if (destroyAdsMatched
      && (destroyAdsUrl.indexOf('http:') === 0
          || destroyAdsUrl.indexOf('https:') === 0)) {
    return '${proxy}';
  }
${DESTROY_ADS_PAC_END}`;

export interface PacRewriteResult {
  readonly source: string;
  readonly changed: boolean;
}

export function rewriteProxyPac(source: string): PacRewriteResult {
  const proxy = source.match(PROXY_PATTERN)?.[0];
  if (!proxy) {
    throw new Error("proxy.pacからNicoCache_nlのproxy指定を取得できません");
  }
  const block = createDestroyAdsPacBlock(proxy);
  const start = source.indexOf(DESTROY_ADS_PAC_START);
  const end = source.indexOf(DESTROY_ADS_PAC_END);
  if (start >= 0 || end >= 0) {
    if (start < 0 || end < start) {
      throw new Error("proxy.pacのdestroy-ads管理ブロックが壊れています");
    }
    const afterEnd = end + DESTROY_ADS_PAC_END.length;
    const rewritten = source.slice(0, start) + block + source.slice(afterEnd);
    return { source: rewritten, changed: rewritten !== source };
  }

  const anchor = source.lastIndexOf(DIRECT_RETURN);
  if (
    anchor < 0 ||
    !/^ {2}return 'DIRECT';\s*\}\s*$/u.test(source.slice(anchor))
  ) {
    throw new Error("proxy.pacの最終DIRECTを安全に特定できません");
  }
  return {
    source: `${source.slice(0, anchor)}${block}\n\n${source.slice(anchor)}`,
    changed: true,
  };
}
