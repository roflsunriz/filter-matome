package extensions;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.extensions.Extension;
import dareka.extensions.RequestFilter;
import dareka.extensions.Rewriter;
import dareka.common.Logger;
import dareka.processor.HttpRequestHeader;
import dareka.processor.HttpResponseHeader;

/**
 * 広告生成コードをブラウザーへ渡す前に無力化し、残った広告要求を
 * NicoCache_nlが上流へ接続する前に破棄する。
 */
public final class DestroyAds implements Extension, RequestFilter, Rewriter {
    private static final String PAC_START =
            "  // filter-matome destroy-ads: managed block start";
    private static final String PAC_END =
            "  // filter-matome destroy-ads: managed block end";
    private static final String PAC_DIRECT_RETURN = "  return 'DIRECT';";
    private static final Pattern PAC_PROXY =
            Pattern.compile("PROXY\\s+127\\.0\\.0\\.1:\\d+");
    private static final Pattern SUPPORTED_REWRITE_URL = Pattern.compile(
            "https?://(?:resource\\.video\\.nimg\\.jp/web/scripts/(?:"
            + "nvpc_next/assets/(?:Advertisement|root|bridge)-[^/?]+\\.js"
            + "|bundle/pages_[^/?]+\\.js)|(?:[^/]+\\.)?nicovideo\\.jp/.*)",
            Pattern.CASE_INSENSITIVE);

    public DestroyAds() {
        installProxyPacRoute();
    }
    private static final Pattern COMPONENT_EXPORT = Pattern.compile(
            "export\\{([A-Za-z_$][\\w$]*) as n,([A-Za-z_$][\\w$]*) as r,"
            + "([A-Za-z_$][\\w$]*) as t\\};");
    private static final Pattern ADS_RESOURCE_LOADER = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\([A-Za-z_$][\\w$]*\\.publicUrl\\.adsResource\\)");
    private static final Pattern GTM_LOADER_CALL = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\([A-Za-z_$][\\w$]*"
            + "\\.NicoGoogleTagManagerDataLayer,`GTM-[A-Z0-9-]+`\\)");
    private static final Pattern LEGACY_MANAGER_AVAILABILITY = Pattern.compile(
            "([A-Za-z_$][\\w$]*)\\.available=!\\(!([A-Za-z_$][\\w$]*)\\(\\)"
            + "\\|\\|!\\2\\(\\)\\.Advertisement\\)");
    private static final Pattern EXTERNAL_ELEMENT = Pattern.compile(
            "<(script|iframe|video|img|source|link)\\b[^>]*"
            + "(?:src|href|poster)\\s*=\\s*([\\\"'])((?:https?:)?//[^\\\"']+)\\2"
            + "[^>]*>(?:[\\s\\S]*?</\\1\\s*>)?",
            Pattern.CASE_INSENSITIVE);

    @Override
    public Object queryInterface(Type type) {
        if (type == Type.RequestFilter1 || type == Type.Rewriter1) {
            return this;
        }
        return null;
    }

    @Override
    public String getVersionString() {
        return "DestroyAds 1.0";
    }

    @Override
    public int onRequest(HttpRequestHeader requestHeader) throws IOException {
        return isBlocked(requestHeader.getHost(), requestHeader.getPath())
                ? RequestFilter.DROP : RequestFilter.OK;
    }

    @Override
    public Pattern getRewriterSupportedURLAsPattern() {
        return SUPPORTED_REWRITE_URL;
    }

    @Override
    public String onMatch(Matcher match, HttpResponseHeader responseHeader,
            String content) throws IOException {
        String url = match.group();
        String lowerUrl = url.toLowerCase(Locale.ROOT);
        String rewritten = content;

        if (lowerUrl.contains("/assets/advertisement-")) {
            rewritten = COMPONENT_EXPORT.matcher(rewritten).replaceAll(
                    "$3=Object.assign(()=>null,{Fallback:()=>null});"
                    + "export{$1 as n,$2 as r,$3 as t};");
        }
        if (lowerUrl.contains("/assets/root-")) {
            rewritten = ADS_RESOURCE_LOADER.matcher(rewritten)
                    .replaceAll("Promise.resolve(null)");
        }
        if (lowerUrl.contains("/assets/bridge-")) {
            rewritten = GTM_LOADER_CALL.matcher(rewritten).replaceAll("void 0");
        }
        if (lowerUrl.contains("/web/scripts/bundle/pages_")) {
            rewritten = LEGACY_MANAGER_AVAILABILITY.matcher(rewritten)
                    .replaceAll("$1.available=!1");
        }
        if (lowerUrl.contains("nicovideo.jp/")) {
            rewritten = removeBlockedElements(rewritten);
        }
        return rewritten;
    }

    private static String removeBlockedElements(String content) {
        Matcher matcher = EXTERNAL_ELEMENT.matcher(content);
        StringBuffer output = new StringBuffer(content.length());
        while (matcher.find()) {
            if (isBlockedUrl(matcher.group(3))) {
                matcher.appendReplacement(output, "");
            } else {
                matcher.appendReplacement(output,
                        Matcher.quoteReplacement(matcher.group()));
            }
        }
        matcher.appendTail(output);
        return output.toString();
    }

    private static boolean isBlockedUrl(String value) {
        if (value.startsWith("//")) {
            value = "https:" + value;
        }
        Matcher matcher = Pattern.compile(
                "(?i)^https?://([^/:]+)(?::\\d+)?([^?#]*)").matcher(value);
        return matcher.find() && isBlocked(matcher.group(1), matcher.group(2));
    }

    private static boolean isBlocked(String rawHost, String rawPath) {
        if (rawHost == null) {
            return false;
        }
        String host = rawHost.toLowerCase(Locale.ROOT);
        String path = rawPath == null ? "/" : rawPath;
        if (host.endsWith(".")) {
            host = host.substring(0, host.length() - 1);
        }

        if (host.equals("ads.nicovideo.jp")
                || host.endsWith(".ads.nicovideo.jp")
                || host.equals("api.nicoad.nicovideo.jp")
                || host.equals("analytics.twitter.com")
                || host.equals("analytics.tiktok.com")
                || host.equals("analytics-ipv6.tiktokw.us")
                || host.equals("imasdk.googleapis.com")
                || host.equals("static.ads-twitter.com")
                || host.equals("tag.flvcdn.net")) {
            return true;
        }
        if (host.endsWith(".doubleclick.net")
                || host.endsWith(".googlesyndication.com")
                || host.endsWith(".googletagmanager.com")
                || host.endsWith(".googleadservices.com")
                || host.endsWith(".ad-stir.com")
                || host.endsWith(".adtdp.com")
                || host.endsWith(".pubmatic.com")
                || host.endsWith(".amazon-adsystem.com")
                || host.endsWith(".adtrafficquality.google")
                || host.endsWith(".impact-ad.jp")
                || host.endsWith(".im-apps.net")
                || host.endsWith(".socdm.com")
                || host.endsWith(".rubiconproject.com")
                || host.endsWith(".ad-delivery.net")
                || host.endsWith(".microad.jp")
                || host.endsWith(".adnxs.com")
                || host.endsWith(".media.net")
                || host.endsWith(".adingo.jp")
                || host.endsWith(".casalemedia.com")
                || host.endsWith(".criteo.com")
                || host.endsWith(".openx.net")
                || host.endsWith(".indexww.com")
                || host.endsWith(".ladsp.com")
                || host.endsWith(".i-mobile.co.jp")
                || host.endsWith(".genieesspv.jp")
                || host.endsWith(".gsspcln.jp")
                || host.endsWith(".id5-sync.com")
                || host.endsWith(".gmossp-sp.jp")
                || host.endsWith(".creativecdn.com")
                || host.endsWith(".slim02.jp")
                || host.endsWith(".crwdcntrl.net")
                || host.endsWith(".rlcdn.com")
                || host.endsWith(".2mdn.net")) {
            return true;
        }
        return (host.equals("dcdn.cdn.nimg.jp")
                    && path.startsWith("/nicoad/instream/"))
                || (host.equals("secure-dcdn.cdn.nimg.jp")
                    && path.startsWith("/nicoad/"))
                || ((host.equals("www.google.com")
                        || host.equals("www.google.co.jp"))
                    && (path.startsWith("/pagead/")
                        || path.startsWith("/ccm/")))
                || (host.equals("s.yimg.jp")
                    && (path.startsWith("/images/listing/tool/cv/")
                        || path.startsWith("/images/listing/tool/yads/")))
                || host.equals("apm.yahoo.co.jp")
                || host.equals("b99.yahoo.co.jp")
                || host.equals("cksync.yahoo.co.jp")
                || host.equals("yads.c.yimg.jp")
                || host.equals("yads.yjtag.yahoo.co.jp");
    }

    private static void installProxyPacRoute() {
        String dataRootProperty = System.getProperty("nicocache.userDataRoot");
        if (dataRootProperty == null || dataRootProperty.isBlank()) {
            Logger.warning("DestroyAds: userDataRootを取得できないためproxy.pacを更新しません");
            return;
        }
        Path dataRoot = Path.of(dataRootProperty).toAbsolutePath().normalize();
        Path pac = dataRoot.resolve("proxy.pac").normalize();
        if (!pac.startsWith(dataRoot) || !Files.isRegularFile(pac)) {
            Logger.warning("DestroyAds: proxy.pacを安全に特定できません: " + pac);
            return;
        }
        try {
            String original = Files.readString(pac, StandardCharsets.UTF_8);
            String rewritten = rewriteProxyPac(original);
            if (rewritten.equals(original)) {
                return;
            }
            Path backup = pac.resolveSibling("proxy.pac.destroy-ads.bak");
            if (!Files.exists(backup)) {
                Files.copy(pac, backup, StandardCopyOption.COPY_ATTRIBUTES);
            }
            Path temporary = pac.resolveSibling("proxy.pac.destroy-ads.tmp");
            Files.deleteIfExists(temporary);
            Files.writeString(temporary, rewritten, StandardCharsets.UTF_8);
            try {
                Files.move(temporary, pac, StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException error) {
                Files.move(temporary, pac, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException | IllegalStateException error) {
            Logger.warning("DestroyAds: proxy.pacを更新できません: "
                    + error.getMessage());
        }
    }

    private static String rewriteProxyPac(String source) {
        Matcher proxyMatcher = PAC_PROXY.matcher(source);
        if (!proxyMatcher.find()) {
            throw new IllegalStateException("NicoCache_nlのproxy指定がありません");
        }
        String block = managedPacBlock(proxyMatcher.group());
        int start = source.indexOf(PAC_START);
        int end = source.indexOf(PAC_END);
        if (start >= 0 || end >= 0) {
            if (start < 0 || end < start) {
                throw new IllegalStateException("管理ブロックが壊れています");
            }
            int afterEnd = end + PAC_END.length();
            return source.substring(0, start) + block + source.substring(afterEnd);
        }
        int anchor = source.lastIndexOf(PAC_DIRECT_RETURN);
        if (anchor < 0 || !source.substring(anchor).matches(
                "(?s)  return 'DIRECT';\\s*}\\s*")) {
            throw new IllegalStateException("最終DIRECTを安全に特定できません");
        }
        return source.substring(0, anchor) + block + "\n\n"
                + source.substring(anchor);
    }

    private static String managedPacBlock(String proxy) {
        return PAC_START + "\n"
                + "  var destroyAdsHost = host.toLowerCase();\n"
                + "  var destroyAdsUrl = url.toLowerCase();\n"
                + "  if (destroyAdsHost === 'ads.nicovideo.jp'\n"
                + "      || dnsDomainIs(destroyAdsHost, '.ads.nicovideo.jp')\n"
                + "      || destroyAdsHost === 'api.nicoad.nicovideo.jp'\n"
                + "      || dnsDomainIs(destroyAdsHost, '.doubleclick.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.googlesyndication.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.googletagmanager.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.googleadservices.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.ad-stir.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.adtdp.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.pubmatic.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.amazon-adsystem.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.rubiconproject.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.criteo.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.openx.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.microad.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.adnxs.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.i-mobile.co.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.im-apps.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.socdm.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.impact-ad.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.ad-delivery.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.media.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.adingo.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.casalemedia.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.indexww.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.ladsp.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.genieesspv.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.gsspcln.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.id5-sync.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.gmossp-sp.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.creativecdn.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.slim02.jp')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.crwdcntrl.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.rlcdn.com')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.2mdn.net')\n"
                + "      || dnsDomainIs(destroyAdsHost, '.adtrafficquality.google')\n"
                + "      || destroyAdsHost === 'analytics.twitter.com'\n"
                + "      || destroyAdsHost === 'static.ads-twitter.com'\n"
                + "      || destroyAdsHost === 'analytics.tiktok.com'\n"
                + "      || destroyAdsHost === 'analytics-ipv6.tiktokw.us'\n"
                + "      || destroyAdsHost === 'imasdk.googleapis.com'\n"
                + "      || destroyAdsHost === 'tag.flvcdn.net'\n"
                + "      || destroyAdsHost === 'apm.yahoo.co.jp'\n"
                + "      || destroyAdsHost === 'b99.yahoo.co.jp'\n"
                + "      || destroyAdsHost === 'cksync.yahoo.co.jp'\n"
                + "      || destroyAdsHost === 'yads.c.yimg.jp'\n"
                + "      || destroyAdsHost === 'yads.yjtag.yahoo.co.jp'\n"
                + "      || (destroyAdsHost === 'dcdn.cdn.nimg.jp'\n"
                + "          && destroyAdsUrl.indexOf('/nicoad/instream/') >= 0)\n"
                + "      || (destroyAdsHost === 'secure-dcdn.cdn.nimg.jp'\n"
                + "          && destroyAdsUrl.indexOf('/nicoad/') >= 0)\n"
                + "      || ((destroyAdsHost === 'www.google.com'\n"
                + "           || destroyAdsHost === 'www.google.co.jp')\n"
                + "          && (destroyAdsUrl.indexOf('/pagead/') >= 0\n"
                + "              || destroyAdsUrl.indexOf('/ccm/') >= 0))\n"
                + "      || (destroyAdsHost === 's.yimg.jp'\n"
                + "          && (destroyAdsUrl.indexOf('/images/listing/tool/cv/') >= 0\n"
                + "              || destroyAdsUrl.indexOf('/images/listing/tool/yads/') >= 0))) {\n"
                + "    return '" + proxy + "';\n"
                + "  };\n" + PAC_END;
    }
}
