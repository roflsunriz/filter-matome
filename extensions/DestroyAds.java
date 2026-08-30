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

import dareka.NLMain;
import dareka.common.LoggerHandler;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.extensions.RequestFilter;
import dareka.extensions.Rewriter;
import dareka.processor.HttpRequestHeader;
import dareka.processor.HttpResponseHeader;

/**
 * 広告生成コードをブラウザーへ渡す前に無力化し、残った広告要求を
 * NicoCache_nlが上流へ接続する前に破棄する。
 */
public final class DestroyAds implements Extension2, RequestFilter, Rewriter {
    private static final String PAC_START =
            "  // filter-matome destroy-ads: managed block start";
    private static final String PAC_END =
            "  // filter-matome destroy-ads: managed block end";
    private static final String PAC_DIRECT_RETURN = "  return 'DIRECT';";
    private static final Pattern PAC_PROXY =
            Pattern.compile("PROXY\\s+127\\.0\\.0\\.1:\\d+");
    private static final String[] EXACT_AD_HOSTS = {
        "ads.nicovideo.jp",
        "api.nicoad.nicovideo.jp",
        "analytics.twitter.com",
        "analytics.tiktok.com",
        "analytics-ipv6.tiktokw.us",
        "imasdk.googleapis.com",
        "static.ads-twitter.com",
        "tag.flvcdn.net"
    };
    private static final String[] AD_HOST_SUFFIXES = {
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
        ".2mdn.net"
    };
    private static final String[][] AD_PATH_RULES = {
        {"dcdn.cdn.nimg.jp", "/nicoad/instream/"},
        {"secure-dcdn.cdn.nimg.jp", "/nicoad/"},
        {"www.google.com", "/pagead/", "/ccm/"},
        {"www.google.co.jp", "/pagead/", "/ccm/"},
        {"s.yimg.jp", "/images/listing/tool/cv/",
                "/images/listing/tool/yads/"},
        {"apm.yahoo.co.jp", "/"},
        {"b99.yahoo.co.jp", "/"},
        {"cksync.yahoo.co.jp", "/"},
        {"yads.c.yimg.jp", "/"},
        {"yads.yjtag.yahoo.co.jp", "/"}
    };
    private static final Pattern SUPPORTED_REWRITE_URL = Pattern.compile(
            "https?://(?:resource\\.video\\.nimg\\.jp/web/scripts/(?:"
            + "nvpc_next/assets/(?:Advertisement|root|bridge|"
            + "PlayerVolumeBar)-[^/?]+\\.js"
            + "|bundle/pages_[^/?]+\\.js)|(?:[^/]+\\.)?nicovideo\\.jp/.*)",
            Pattern.CASE_INSENSITIVE);

    private volatile LoggerHandler extensionLogger;
    private boolean pacRouteInitialized;
    private static final Pattern COMPONENT_EXPORT = Pattern.compile(
            "export\\{([A-Za-z_$][\\w$]*) as n,([A-Za-z_$][\\w$]*) as r,"
            + "([A-Za-z_$][\\w$]*) as t\\};");
    private static final Pattern ADS_RESOURCE_LOADER = Pattern.compile(
            "([A-Za-z_$][\\w$]*)\\([A-Za-z_$][\\w$]*"
            + "\\.publicUrl\\.adsResource\\)");
    private static final Pattern GTM_LOADER_CALL = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\([A-Za-z_$][\\w$]*"
            + "\\.NicoGoogleTagManagerDataLayer,`GTM-[A-Z0-9-]+`\\)");
    private static final Pattern LEGACY_MANAGER_AVAILABILITY = Pattern.compile(
            "([A-Za-z_$][\\w$]*)\\.available=!\\(!([A-Za-z_$][\\w$]*)\\(\\)"
            + "\\|\\|!\\2\\(\\)\\.Advertisement\\)");
    private static final Pattern SNAPSHOT_ADS_RESOURCE_LOADER = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\([A-Za-z_$][\\w$]*\\.getSnapshot\\(\\)"
            + "\\.publicUrl\\.adsResource\\)");
    private static final Pattern IMA_DETECTOR_LOADER = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\(`https://imasdk\\.googleapis\\.com/"
            + "js/sdkloader/ima3\\.js`\\)");
    private static final Pattern OPENX_DETECTOR_LOADER = Pattern.compile(
            "[A-Za-z_$][\\w$]*\\(`https://dwango-d\\.openx\\.net/"
            + "w/1\\.0/jstag`\\)");
    private static final Pattern EXTERNAL_ELEMENT = Pattern.compile(
            "<(script|iframe|video|img|source|link)\\b[^>]*"
            + "(?:src|href|poster)\\s*=\\s*([\\\"'])((?:https?:)?//[^\\\"']+)\\2"
            + "[^>]*>(?:[\\s\\S]*?</\\1\\s*>)?",
            Pattern.CASE_INSENSITIVE);

    @Override
    public synchronized void registerExtensions(ExtensionManager manager) {
        if (extensionLogger == null) {
            extensionLogger = NLMain.getExtLogger(
                    this, "DestroyAds", null, true);
        }
        if (!pacRouteInitialized) {
            pacRouteInitialized = true;
            installProxyPacRoute();
        }
        manager.registerRewriter(this);
        manager.registerRequestFilter(this);
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
                    .replaceAll("$1(`/local/features/dist/ad-stub`)");
        }
        if (lowerUrl.contains("/assets/bridge-")) {
            rewritten = GTM_LOADER_CALL.matcher(rewritten).replaceAll("void 0");
        }
        if (lowerUrl.contains("/assets/playervolumebar-")
                && countMatches(SNAPSHOT_ADS_RESOURCE_LOADER, rewritten) == 1
                && countMatches(IMA_DETECTOR_LOADER, rewritten) == 1
                && countMatches(OPENX_DETECTOR_LOADER, rewritten) == 1) {
            String rejected = "Promise.reject(null)"
                    + "/*filter-matome:adblock-detector*/";
            rewritten = SNAPSHOT_ADS_RESOURCE_LOADER.matcher(rewritten)
                    .replaceAll(rejected);
            rewritten = IMA_DETECTOR_LOADER.matcher(rewritten)
                    .replaceAll(rejected);
            rewritten = OPENX_DETECTOR_LOADER.matcher(rewritten)
                    .replaceAll(rejected);
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

    private static int countMatches(Pattern pattern, String content) {
        int count = 0;
        Matcher matcher = pattern.matcher(content);
        while (matcher.find()) {
            count++;
        }
        return count;
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

        for (String exactHost : EXACT_AD_HOSTS) {
            if (host.equals(exactHost)) {
                return true;
            }
        }
        for (String suffix : AD_HOST_SUFFIXES) {
            if (host.endsWith(suffix)) {
                return true;
            }
        }
        for (String[] rule : AD_PATH_RULES) {
            if (!host.equals(rule[0])) {
                continue;
            }
            for (int index = 1; index < rule.length; index++) {
                if (path.startsWith(rule[index])) {
                    return true;
                }
            }
        }
        return false;
    }

    private void installProxyPacRoute() {
        String dataRootProperty = System.getProperty("nicocache.userDataRoot");
        if (dataRootProperty == null || dataRootProperty.isBlank()) {
            logWarning("userDataRootを取得できないためproxy.pacを更新しません");
            return;
        }
        Path dataRoot = Path.of(dataRootProperty).toAbsolutePath().normalize();
        Path pac = dataRoot.resolve("proxy.pac").normalize();
        if (!pac.startsWith(dataRoot) || !Files.isRegularFile(pac)) {
            logWarning("proxy.pacを安全に特定できません: " + pac);
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
            logWarning("proxy.pacを更新できません: " + error.getMessage());
        }
    }

    private void logWarning(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.warning(message);
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
        StringBuilder block = new StringBuilder(PAC_START).append('\n')
                .append("  var destroyAdsHost = host.toLowerCase();\n")
                .append("  if (destroyAdsHost.charAt("
                        + "destroyAdsHost.length - 1) === '.') {\n")
                .append("    destroyAdsHost = destroyAdsHost.substring("
                        + "0, destroyAdsHost.length - 1);\n")
                .append("  }\n")
                .append("  var destroyAdsUrl = url.toLowerCase();\n");
        appendPacArray(block, "destroyAdsExactHosts", EXACT_AD_HOSTS);
        appendPacArray(block, "destroyAdsHostSuffixes", AD_HOST_SUFFIXES);
        appendPacPathRules(block);
        return block.append(
                "  var destroyAdsMatched = false;\n"
                + "  var destroyAdsIndex;\n\n"
                + "  for (destroyAdsIndex = 0;\n"
                + "       destroyAdsIndex < destroyAdsExactHosts.length;\n"
                + "       destroyAdsIndex++) {\n"
                + "    if (destroyAdsHost === destroyAdsExactHosts[destroyAdsIndex]) {\n"
                + "      destroyAdsMatched = true;\n"
                + "      break;\n"
                + "    }\n"
                + "  }\n\n"
                + "  if (!destroyAdsMatched) {\n"
                + "    for (destroyAdsIndex = 0;\n"
                + "         destroyAdsIndex < destroyAdsHostSuffixes.length;\n"
                + "         destroyAdsIndex++) {\n"
                + "      if (dnsDomainIs(\n"
                + "          destroyAdsHost,\n"
                + "          destroyAdsHostSuffixes[destroyAdsIndex]\n"
                + "      )) {\n"
                + "        destroyAdsMatched = true;\n"
                + "        break;\n"
                + "      }\n"
                + "    }\n"
                + "  }\n\n"
                + "  if (!destroyAdsMatched) {\n"
                + "    var destroyAdsPathStart = destroyAdsUrl.indexOf('://');\n"
                + "    destroyAdsPathStart = destroyAdsUrl.indexOf('/', destroyAdsPathStart + 3);\n"
                + "    var destroyAdsPath = destroyAdsPathStart >= 0\n"
                + "      ? destroyAdsUrl.substring(destroyAdsPathStart)\n"
                + "      : '/';\n"
                + "    for (destroyAdsIndex = 0;\n"
                + "         destroyAdsIndex < destroyAdsPathRules.length;\n"
                + "         destroyAdsIndex++) {\n"
                + "      var destroyAdsRule = destroyAdsPathRules[destroyAdsIndex];\n"
                + "      if (destroyAdsHost !== destroyAdsRule[0]) {\n"
                + "        continue;\n"
                + "      }\n"
                + "      for (var destroyAdsPrefixIndex = 0;\n"
                + "           destroyAdsPrefixIndex < destroyAdsRule[1].length;\n"
                + "           destroyAdsPrefixIndex++) {\n"
                + "        if (destroyAdsPath.indexOf(\n"
                + "            destroyAdsRule[1][destroyAdsPrefixIndex]\n"
                + "        ) === 0) {\n"
                + "          destroyAdsMatched = true;\n"
                + "          break;\n"
                + "        }\n"
                + "      }\n"
                + "      if (destroyAdsMatched) {\n"
                + "        break;\n"
                + "      }\n"
                + "    }\n"
                + "  }\n\n"
                + "  if (destroyAdsMatched\n"
                + "      && (destroyAdsUrl.indexOf('http:') === 0\n"
                + "          || destroyAdsUrl.indexOf('https:') === 0)) {\n"
                + "    return '").append(proxy).append("';\n"
                + "  }\n").append(PAC_END).toString();
    }

    private static void appendPacArray(StringBuilder block, String name,
            String[] values) {
        block.append("  var ").append(name).append(" = [\n");
        for (int index = 0; index < values.length; index++) {
            block.append("    \"").append(values[index]).append('"');
            block.append(index + 1 < values.length ? ",\n" : "\n");
        }
        block.append("  ];\n");
    }

    private static void appendPacPathRules(StringBuilder block) {
        block.append("  var destroyAdsPathRules = [\n");
        for (int ruleIndex = 0; ruleIndex < AD_PATH_RULES.length; ruleIndex++) {
            String[] rule = AD_PATH_RULES[ruleIndex];
            block.append("    [\"").append(rule[0]).append("\", [");
            for (int prefixIndex = 1; prefixIndex < rule.length; prefixIndex++) {
                if (prefixIndex > 1) {
                    block.append(',');
                }
                block.append('"').append(rule[prefixIndex]).append('"');
            }
            block.append(ruleIndex + 1 < AD_PATH_RULES.length
                    ? "]],\n" : "]]\n");
        }
        block.append("  ];\n");
    }
}
