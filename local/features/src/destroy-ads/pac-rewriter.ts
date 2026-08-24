export const DESTROY_ADS_PAC_START =
  "  // filter-matome destroy-ads: managed block start";
export const DESTROY_ADS_PAC_END =
  "  // filter-matome destroy-ads: managed block end";

const DIRECT_RETURN = "  return 'DIRECT';";
const PROXY_PATTERN = /PROXY\s+127\.0\.0\.1:\d+/;

const managedBlock = (proxy: string): string => `${DESTROY_ADS_PAC_START}
  var destroyAdsHost = host.toLowerCase();
  var destroyAdsUrl = url.toLowerCase();
  if (
      destroyAdsHost === 'ads.nicovideo.jp'
      || dnsDomainIs(destroyAdsHost, '.ads.nicovideo.jp')
      || destroyAdsHost === 'api.nicoad.nicovideo.jp'
      || dnsDomainIs(destroyAdsHost, '.doubleclick.net')
      || dnsDomainIs(destroyAdsHost, '.googlesyndication.com')
      || dnsDomainIs(destroyAdsHost, '.googletagmanager.com')
      || dnsDomainIs(destroyAdsHost, '.googleadservices.com')
      || dnsDomainIs(destroyAdsHost, '.ad-stir.com')
      || dnsDomainIs(destroyAdsHost, '.adtdp.com')
      || dnsDomainIs(destroyAdsHost, '.pubmatic.com')
      || dnsDomainIs(destroyAdsHost, '.amazon-adsystem.com')
      || dnsDomainIs(destroyAdsHost, '.rubiconproject.com')
      || dnsDomainIs(destroyAdsHost, '.criteo.com')
      || dnsDomainIs(destroyAdsHost, '.openx.net')
      || dnsDomainIs(destroyAdsHost, '.microad.jp')
      || dnsDomainIs(destroyAdsHost, '.adnxs.com')
      || dnsDomainIs(destroyAdsHost, '.i-mobile.co.jp')
      || dnsDomainIs(destroyAdsHost, '.im-apps.net')
      || dnsDomainIs(destroyAdsHost, '.socdm.com')
      || dnsDomainIs(destroyAdsHost, '.impact-ad.jp')
      || dnsDomainIs(destroyAdsHost, '.ad-delivery.net')
      || dnsDomainIs(destroyAdsHost, '.media.net')
      || dnsDomainIs(destroyAdsHost, '.adingo.jp')
      || dnsDomainIs(destroyAdsHost, '.casalemedia.com')
      || dnsDomainIs(destroyAdsHost, '.indexww.com')
      || dnsDomainIs(destroyAdsHost, '.ladsp.com')
      || dnsDomainIs(destroyAdsHost, '.genieesspv.jp')
      || dnsDomainIs(destroyAdsHost, '.gsspcln.jp')
      || dnsDomainIs(destroyAdsHost, '.id5-sync.com')
      || dnsDomainIs(destroyAdsHost, '.gmossp-sp.jp')
      || dnsDomainIs(destroyAdsHost, '.creativecdn.com')
      || dnsDomainIs(destroyAdsHost, '.slim02.jp')
      || dnsDomainIs(destroyAdsHost, '.crwdcntrl.net')
      || dnsDomainIs(destroyAdsHost, '.rlcdn.com')
      || dnsDomainIs(destroyAdsHost, '.2mdn.net')
      || dnsDomainIs(destroyAdsHost, '.adtrafficquality.google')
      || destroyAdsHost === 'analytics.twitter.com'
      || destroyAdsHost === 'static.ads-twitter.com'
      || destroyAdsHost === 'analytics.tiktok.com'
      || destroyAdsHost === 'analytics-ipv6.tiktokw.us'
      || destroyAdsHost === 'imasdk.googleapis.com'
      || destroyAdsHost === 'tag.flvcdn.net'
      || destroyAdsHost === 'apm.yahoo.co.jp'
      || destroyAdsHost === 'b99.yahoo.co.jp'
      || destroyAdsHost === 'cksync.yahoo.co.jp'
      || destroyAdsHost === 'yads.c.yimg.jp'
      || destroyAdsHost === 'yads.yjtag.yahoo.co.jp'
      || (destroyAdsHost === 'dcdn.cdn.nimg.jp'
          && destroyAdsUrl.indexOf('/nicoad/instream/') >= 0)
      || (destroyAdsHost === 'secure-dcdn.cdn.nimg.jp'
          && destroyAdsUrl.indexOf('/nicoad/') >= 0)
      || ((destroyAdsHost === 'www.google.com'
           || destroyAdsHost === 'www.google.co.jp')
          && (destroyAdsUrl.indexOf('/pagead/') >= 0
              || destroyAdsUrl.indexOf('/ccm/') >= 0))
      || (destroyAdsHost === 's.yimg.jp'
          && (destroyAdsUrl.indexOf('/images/listing/tool/cv/') >= 0
              || destroyAdsUrl.indexOf('/images/listing/tool/yads/') >= 0))) {
    return '${proxy}';
  };
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
  const block = managedBlock(proxy);
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
