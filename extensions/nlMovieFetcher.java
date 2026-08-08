package extensions;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetSocketAddress;
import java.net.Proxy;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;

import dareka.NLMain;
import dareka.common.Logger;
import dareka.common.LoggerHandler;
import dareka.common.TextUtil;
import dareka.common.json.Json;
import dareka.common.json.JsonNumber;
import dareka.common.json.JsonObject;
import dareka.common.json.JsonValue;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;
import dareka.processor.impl.Cache;
import dareka.processor.impl.CacheManager;
import dareka.processor.impl.VideoDescriptor;

/**
 * 現行Domand/CMAF配信をNicoCache_nl自身のプロキシー経由で最後まで取得する。
 * 視聴権の取得はログイン状態を持つブラウザー側へ任せ、この拡張は署名済みURLだけを扱う。
 */
public final class nlMovieFetcher implements Extension2, Processor {
    public static final int REVISION = 26080904;
    public static final String VER_STRING = "nlMovieFetcher_" + REVISION;

    private static final String API_PREFIX = "/cache/filter-matome/v1/movie-fetcher/";
    private static final String REQUIRED_HEADER = "X-Filter-Matome-Movie-Fetcher";
    private static final String[] METHODS = { "GET", "POST" };
    private static final Pattern API_URL = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp" + API_PREFIX
                    + "(capabilities|start|status|cancel|report)(?:\\?([^#]*))?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern VIDEO_ID = Pattern.compile(
            "^[a-z]{2}[0-9]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern CLIENT_LOG_URL = Pattern.compile(
            "https?://\\S+", Pattern.CASE_INSENSITIVE);
    private static final Pattern URI_ATTRIBUTE = Pattern.compile(
            "(?:^|[:,])URI=\\\"([^\\\"]+)\\\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern CURRENT_CMAF_RESOURCE_PATH = Pattern.compile(
            "^/cache/file/[A-Za-z0-9._~-]{1,256}="
                    + "[A-Za-z0-9._~,=-]{1,256}//(?:"
                    + "(?:master|audio|video)\\.m3u8"
                    + "|audio/[A-Za-z0-9._-]{1,128}\\.cmfa"
                    + "|video/[A-Za-z0-9._-]{1,128}\\.cmfv)$");
    private static final Pattern ASSET_CMAF_RESOURCE_PATH = Pattern.compile(
            "^/[a-f0-9]{24}/(?:"
                    + "audio/[0-9]{1,6}/audio-[A-Za-z0-9._-]{1,96}/"
                    + "[A-Za-z0-9._-]{1,128}\\.cmfa"
                    + "|video/[0-9]{1,6}/video-[A-Za-z0-9._-]{1,96}/"
                    + "[A-Za-z0-9._-]{1,128}\\.cmfv)$");
    private static final int MAX_REQUEST_BODY = 8 * 1024;
    private static final int MAX_PLAYLIST = 2 * 1024 * 1024;
    private static final int CONNECT_TIMEOUT_MS = 20_000;
    private static final int READ_TIMEOUT_MS = 60_000;
    private static final String DATA_ROOT_PROPERTY = "nicocache.userDataRoot";

    private final ConcurrentHashMap<String, String> states =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> completed =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Integer> totals =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> errors =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> transferredBytes =
            new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Thread> workers =
            new ConcurrentHashMap<>();
    private static volatile SSLSocketFactory proxyTlsSocketFactory;
    private volatile LoggerHandler extensionLogger;

    @Override
    public void registerExtensions(ExtensionManager manager) {
        manager.registerProcessor(this);
        if (extensionLogger == null) {
            extensionLogger = NLMain.getExtLogger(
                    this, "nlMovieFetcher", null, false);
        }
    }

    @Override
    public String getVersionString() {
        return VER_STRING;
    }

    @Override
    public String[] getSupportedMethods() {
        return METHODS;
    }

    @Override
    public Pattern getSupportedURLAsPattern() {
        return API_URL;
    }

    @Override
    public String getSupportedURLAsString() {
        return null;
    }

    @Override
    public Resource onRequest(HttpRequestHeader request, Socket browser)
            throws IOException {
        Matcher matcher = API_URL.matcher(request.getURI());
        if (!matcher.matches()
                || !"1".equals(request.getMessageHeader(REQUIRED_HEADER))) {
            return StringResource.getNotFound();
        }
        String operation = matcher.group(1).toLowerCase(Locale.ROOT);
        if ("capabilities".equals(operation)) {
            return request.isGetMethod()
                    ? json("{\"apiVersion\":1,\"extensionVersion\":\""
                            + VER_STRING + "\",\"delivery\":\"domand-cmaf\"}")
                    : StringResource.getMethodNotAllowed();
        }
        if ("status".equals(operation)) {
            if (!request.isGetMethod()) {
                return StringResource.getMethodNotAllowed();
            }
            return status(queryValue(matcher.group(2), "videoId"));
        }
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return StringResource.getMethodNotAllowed();
        }
        if ("cancel".equals(operation)) {
            return cancel(readVideoId(request, browser));
        }
        if ("start".equals(operation)) {
            return start(request, browser);
        }
        if ("report".equals(operation)) {
            return report(request, browser);
        }
        return StringResource.getNotFound();
    }

    private Resource report(HttpRequestHeader request, Socket browser)
            throws IOException {
        JsonObject body = readJsonObject(request, browser);
        if (body == null) {
            return StringResource.getBadRequest();
        }
        String videoId = stringValue(body, "videoId");
        String message = safeClientMessage(stringValue(body, "message"));
        if (!validVideoId(videoId) || message == null) {
            logWarning("不正なブラウザーログ報告を拒否しました");
            return StringResource.getBadRequest();
        }
        logWarning(videoId.toLowerCase(Locale.ROOT)
                + ": ブラウザー側取得失敗: " + message);
        return json("{\"reported\":true}");
    }

    private Resource start(HttpRequestHeader request, Socket browser)
            throws IOException {
        JsonObject body = readJsonObject(request, browser);
        if (body == null) {
            return StringResource.getBadRequest();
        }
        String videoId = stringValue(body, "videoId");
        String contentUrl = stringValue(body, "contentUrl");
        long maximumBytesPerSecond = longValue(
                body, "maxBytesPerSecond", 0L);
        if (!validVideoId(videoId)
                || !isAllowedMasterPlaylistUrl(contentUrl)) {
            logWarning("不正な取得要求を拒否しました");
            return StringResource.getBadRequest();
        }
        videoId = videoId.toLowerCase(Locale.ROOT);
        Thread previous = workers.get(videoId);
        if (previous != null && previous.isAlive()) {
            logInfo(videoId + ": 既に取得中です");
            return status(videoId);
        }

        final String jobVideoId = videoId;
        final String jobUrl = contentUrl;
        final String jobCookie = deliveryCookie(
                request.getMessageHeader("Cookie"));
        states.put(jobVideoId, "queued");
        completed.put(jobVideoId, 0);
        totals.put(jobVideoId, 0);
        errors.remove(jobVideoId);
        transferredBytes.put(jobVideoId, 0L);
        logInfo(jobVideoId + ": 取得要求を受け付けました");
        Thread worker = new Thread(
                () -> runJob(jobVideoId, jobUrl, jobCookie,
                        Math.max(0L, maximumBytesPerSecond)),
                "nlMovieFetcher-" + jobVideoId);
        worker.setDaemon(true);
        workers.put(jobVideoId, worker);
        worker.start();
        return status(jobVideoId);
    }

    private Resource cancel(String videoId) {
        if (!validVideoId(videoId)) {
            return StringResource.getBadRequest();
        }
        videoId = videoId.toLowerCase(Locale.ROOT);
        Thread worker = workers.get(videoId);
        if (worker != null && worker.isAlive()) {
            states.put(videoId, "canceling");
            logInfo(videoId + ": 中止要求を受け付けました");
            worker.interrupt();
        }
        return status(videoId);
    }

    private void runJob(
            String videoId, String masterUrl, String deliveryCookie,
            long maximumBytesPerSecond) {
        long startedAt = System.currentTimeMillis();
        try {
            states.put(videoId, "fetching");
            logInfo(videoId + ": master playlistを取得します");
            String master = fetchText(videoId, masterUrl, deliveryCookie,
                    maximumBytesPerSecond, startedAt);
            Set<String> playlists = extractUris(masterUrl, master);
            if (playlists.isEmpty()) {
                throw new IOException("master playlist has no child playlist");
            }
            logInfo(videoId + ": media playlistを"
                    + playlists.size() + "件検出しました");

            Set<String> mediaResources = new LinkedHashSet<>();
            totals.put(videoId, playlists.size());
            int playlistIndex = 0;
            for (String playlistUrl : playlists) {
                checkCanceled();
                String media = fetchText(videoId, playlistUrl,
                        deliveryCookie, maximumBytesPerSecond, startedAt);
                playlistIndex++;
                completed.merge(videoId, 1, Integer::sum);
                mediaResources.addAll(extractUris(playlistUrl, media));
                logInfo(videoId + ": media playlist取得 "
                        + playlistIndex + "/" + playlists.size());
            }
            if (mediaResources.isEmpty()) {
                throw new IOException("media playlist has no resources");
            }
            totals.put(videoId, playlists.size() + mediaResources.size());
            logInfo(videoId + ": CMAFリソースを"
                    + mediaResources.size() + "件検出しました");
            int resourceIndex = 0;
            for (String resourceUrl : mediaResources) {
                checkCanceled();
                fetchBinary(videoId, resourceUrl, deliveryCookie,
                        maximumBytesPerSecond, startedAt);
                resourceIndex++;
                completed.merge(videoId, 1, Integer::sum);
                if (resourceIndex == 1 || resourceIndex % 10 == 0
                        || resourceIndex == mediaResources.size()) {
                    logInfo(videoId + ": CMAFリソース取得 "
                            + resourceIndex + "/" + mediaResources.size());
                }
            }
            if (!hasCompletedCache(videoId)) {
                throw new IOException("completed cache was not created");
            }
            states.put(videoId, "completed");
            logInfo(videoId + ": 取得完了");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            states.put(videoId, "canceled");
            logInfo(videoId + ": 取得を中止しました");
        } catch (IOException | RuntimeException exception) {
            states.put(videoId, "failed");
            String error = safeError(exception);
            errors.put(videoId, error);
            logWarning(videoId + ": 取得失敗: " + error);
        } finally {
            workers.remove(videoId, Thread.currentThread());
        }
    }

    private boolean hasCompletedCache(String videoId)
            throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt++) {
            for (VideoDescriptor video : CacheManager.getVideos(videoId)) {
                if (new Cache(video).exists()) {
                    return true;
                }
            }
            Thread.sleep(100L);
        }
        return false;
    }

    private String fetchText(String videoId, String url,
            String deliveryCookie, long maximumBytesPerSecond,
            long startedAt)
            throws IOException, InterruptedException {
        byte[] bytes = fetch(videoId, url, MAX_PLAYLIST, deliveryCookie,
                maximumBytesPerSecond, startedAt);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private void fetchBinary(String videoId, String url,
            String deliveryCookie, long maximumBytesPerSecond,
            long startedAt)
            throws IOException, InterruptedException {
        fetch(videoId, url, -1, deliveryCookie, maximumBytesPerSecond,
                startedAt);
    }

    private byte[] fetch(String videoId, String url, int maximum,
            String deliveryCookie, long maximumBytesPerSecond,
            long startedAt)
            throws IOException, InterruptedException {
        if (!isAllowedDomandUrl(url)) {
            throw new IOException("playlist contains a disallowed URL");
        }
        checkCanceled();
        int listenPort = Integer.getInteger("listenPort", 8080);
        Proxy proxy = new Proxy(Proxy.Type.HTTP,
                new InetSocketAddress("127.0.0.1", listenPort));
        HttpURLConnection connection = (HttpURLConnection)
                new URL(url).openConnection(proxy);
        if (connection instanceof HttpsURLConnection) {
            ((HttpsURLConnection) connection).setSSLSocketFactory(
                    getProxyTlsSocketFactory());
        }
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestProperty("User-Agent", "NicoCache_nl/"
                + VER_STRING);
        connection.setRequestProperty("Accept", "*/*");
        connection.setRequestProperty("Origin", "https://www.nicovideo.jp");
        connection.setRequestProperty("Referer", "https://www.nicovideo.jp/");
        if (!deliveryCookie.isEmpty()) {
            connection.setRequestProperty("Cookie", deliveryCookie);
        }
        connection.setRequestProperty("Connection", "close");
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("upstream HTTP " + status);
            }
            try (InputStream input = connection.getInputStream();
                    ByteArrayOutputStream output = maximum < 0
                            ? null : new ByteArrayOutputStream()) {
                byte[] buffer = new byte[32 * 1024];
                int size = 0;
                int read;
                while ((read = input.read(buffer)) >= 0) {
                    checkCanceled();
                    size += read;
                    long total = transferredBytes.merge(
                            videoId, (long) read, Long::sum);
                    throttle(total, maximumBytesPerSecond, startedAt);
                    if (maximum >= 0 && size > maximum) {
                        throw new IOException("playlist is too large");
                    }
                    if (output != null) {
                        output.write(buffer, 0, read);
                    }
                }
                return output == null ? new byte[0] : output.toByteArray();
            }
        } finally {
            connection.disconnect();
        }
    }

    private void throttle(long bytes, long maximumBytesPerSecond,
            long startedAt) throws InterruptedException {
        if (maximumBytesPerSecond <= 0L) {
            return;
        }
        long expectedMillis = bytes > Long.MAX_VALUE / 1000L
                ? Long.MAX_VALUE
                : bytes * 1000L / maximumBytesPerSecond;
        long delay = expectedMillis
                - (System.currentTimeMillis() - startedAt);
        while (delay > 0L) {
            Thread.sleep(Math.min(delay, 250L));
            checkCanceled();
            delay = expectedMillis
                    - (System.currentTimeMillis() - startedAt);
        }
    }

    private String deliveryCookie(String header) {
        if (header == null || header.length() > MAX_REQUEST_BODY
                || header.indexOf('\r') >= 0 || header.indexOf('\n') >= 0) {
            return "";
        }
        StringBuilder selected = new StringBuilder();
        for (String part : header.split(";")) {
            String cookie = part.trim();
            int separator = cookie.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String name = cookie.substring(0, separator).trim();
            if (!"domand_bid".equals(name)) {
                continue;
            }
            if (selected.length() > 0) {
                selected.append("; ");
            }
            selected.append(cookie);
        }
        return selected.toString();
    }

    static SSLSocketFactory getProxyTlsSocketFactory() throws IOException {
        SSLSocketFactory current = proxyTlsSocketFactory;
        if (current != null) {
            return current;
        }
        synchronized (nlMovieFetcher.class) {
            current = proxyTlsSocketFactory;
            if (current != null) {
                return current;
            }
            String dataRoot = System.getProperty(DATA_ROOT_PROPERTY);
            if (dataRoot == null || dataRoot.trim().isEmpty()) {
                throw new IOException(DATA_ROOT_PROPERTY + " is not set");
            }
            File certificate = new File(
                    new File(dataRoot, "certs"), "ca.cer");
            try (InputStream input = new FileInputStream(certificate)) {
                Certificate authority = CertificateFactory
                        .getInstance("X.509").generateCertificate(input);
                KeyStore trustStore = KeyStore.getInstance(
                        KeyStore.getDefaultType());
                trustStore.load(null, null);
                trustStore.setCertificateEntry("nicocache-local-ca", authority);
                TrustManagerFactory factory = TrustManagerFactory.getInstance(
                        TrustManagerFactory.getDefaultAlgorithm());
                factory.init(trustStore);
                SSLContext context = SSLContext.getInstance("TLS");
                context.init(null, factory.getTrustManagers(), null);
                current = context.getSocketFactory();
                proxyTlsSocketFactory = current;
                return current;
            } catch (GeneralSecurityException exception) {
                throw new IOException(
                        "failed to load NicoCache local CA", exception);
            }
        }
    }

    private Set<String> extractUris(String baseUrl, String playlist)
            throws IOException {
        Set<String> result = new LinkedHashSet<>();
        URI base = URI.create(baseUrl);
        for (String rawLine : playlist.split("\\r?\\n")) {
            String line = rawLine.trim();
            if (line.isEmpty()) {
                continue;
            }
            Matcher matcher = URI_ATTRIBUTE.matcher(line);
            while (matcher.find()) {
                addResolvedUri(result, base, matcher.group(1));
            }
            if (!line.startsWith("#")) {
                addResolvedUri(result, base, line);
            }
        }
        return result;
    }

    private void addResolvedUri(Set<String> result, URI base, String value)
            throws IOException {
        URI resolved = base.resolve(value);
        String url = resolved.toString();
        if (!isAllowedDomandUrl(url)) {
            throw new IOException("playlist contains a disallowed URL ("
                    + safeUrlShape(resolved) + ")");
        }
        result.add(url);
    }

    private String safeUrlShape(URI uri) {
        StringBuilder result = new StringBuilder();
        result.append("host=").append(uri.getHost()).append(" path=");
        String path = uri.getPath();
        if (path == null || path.isEmpty()) {
            return result.append("<none>").toString();
        }
        if (path.startsWith("/")) {
            path = path.substring(1);
        }
        for (String segment : path.split("/", -1)) {
            result.append('/');
            if (segment.isEmpty()) {
                continue;
            }
            if (segment.matches("[a-z-]{1,16}")) {
                result.append(segment);
                continue;
            }
            int extension = segment.lastIndexOf('.');
            result.append("<item:").append(segment.length()).append('>');
            if (extension >= 0 && extension < segment.length() - 1) {
                result.append(segment.substring(extension));
            }
        }
        return result.toString();
    }

    private void checkCanceled() throws InterruptedException {
        if (Thread.currentThread().isInterrupted()) {
            throw new InterruptedException("canceled");
        }
    }

    private boolean isAllowedDomandUrl(String value) {
        try {
            URI uri = URI.create(value);
            String host = uri.getHost();
            if (!isSecureDomandUri(uri) || host == null) {
                return false;
            }
            host = host.toLowerCase(Locale.ROOT);
            String path = uri.getPath();
            if (path == null) {
                return false;
            }
            if ("delivery.domand.nicovideo.jp".equals(host)) {
                return path.startsWith("/hlsbid/")
                        || path.startsWith("/shlsbid/")
                        || path.startsWith("/hlsext/")
                        || CURRENT_CMAF_RESOURCE_PATH.matcher(path).matches();
            }
            return "asset.domand.nicovideo.jp".equals(host)
                    && ASSET_CMAF_RESOURCE_PATH.matcher(path).matches();
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isAllowedMasterPlaylistUrl(String value) {
        try {
            URI uri = URI.create(value);
            String path = uri.getPath();
            return isSecureDomandUri(uri)
                    && "delivery.domand.nicovideo.jp".equalsIgnoreCase(
                            uri.getHost())
                    && path != null
                    && (path.startsWith("/hlsbid/")
                            || path.startsWith("/shlsbid/")
                            || path.startsWith("/hlsext/"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private boolean isSecureDomandUri(URI uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
                && uri.getHost() != null
                && uri.getUserInfo() == null
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getFragment() == null;
    }

    private Resource status(String videoId) {
        if (!validVideoId(videoId)) {
            return StringResource.getBadRequest();
        }
        videoId = videoId.toLowerCase(Locale.ROOT);
        String state = states.getOrDefault(videoId, "idle");
        StringBuilder body = new StringBuilder(256);
        body.append('{');
        field(body, "videoId", videoId, false);
        field(body, "status", state, true);
        body.append(",\"completed\":")
                .append(completed.getOrDefault(videoId, 0));
        body.append(",\"total\":").append(totals.getOrDefault(videoId, 0));
        body.append(",\"bytesTransferred\":")
                .append(transferredBytes.getOrDefault(videoId, 0L));
        String error = errors.get(videoId);
        if (error != null) {
            field(body, "error", error, true);
        }
        body.append('}');
        return json(body.toString());
    }

    private String readVideoId(HttpRequestHeader request, Socket browser)
            throws IOException {
        JsonObject object = readJsonObject(request, browser);
        return object == null ? null : stringValue(object, "videoId");
    }

    private JsonObject readJsonObject(HttpRequestHeader request, Socket browser)
            throws IOException {
        long length = request.getContentLength();
        if (length <= 0 || length > MAX_REQUEST_BODY) {
            return null;
        }
        byte[] bytes = new byte[(int) length];
        InputStream input = browser.getInputStream();
        int offset = 0;
        while (offset < bytes.length) {
            int read = input.read(bytes, offset, bytes.length - offset);
            if (read < 0) {
                throw new IOException("request body ended unexpectedly");
            }
            offset += read;
        }
        try {
            JsonValue value = Json.parse(new String(bytes, StandardCharsets.UTF_8));
            return value == null ? null : value.getObject();
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private String stringValue(JsonObject object, String key) {
        JsonValue value = object.get(key);
        return value == null || value.isNull() ? null : value.getString();
    }

    private long longValue(JsonObject object, String key, long fallback) {
        JsonValue value = object.get(key);
        return value instanceof JsonNumber
                ? ((JsonNumber) value).getLong() : fallback;
    }

    private boolean validVideoId(String value) {
        return value != null && VIDEO_ID.matcher(value).matches();
    }

    private String queryValue(String query, String expectedKey) {
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            String[] pair = part.split("=", 2);
            if (pair.length == 2 && expectedKey.equals(pair[0])) {
                try {
                    return java.net.URLDecoder.decode(
                            pair[1], StandardCharsets.UTF_8);
                } catch (IllegalArgumentException exception) {
                    return null;
                }
            }
        }
        return null;
    }

    private String safeError(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isEmpty()) {
            return exception.getClass().getSimpleName();
        }
        return message.length() > 160 ? message.substring(0, 160) : message;
    }

    private String safeClientMessage(String message) {
        if (message == null) {
            return null;
        }
        String safe = CLIENT_LOG_URL.matcher(message).replaceAll("[URL省略]")
                .replace('\r', ' ').replace('\n', ' ').replace('\t', ' ')
                .trim();
        if (safe.isEmpty()) {
            return null;
        }
        return safe.length() > 160 ? safe.substring(0, 160) : safe;
    }

    private void logInfo(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.info(message);
        } else {
            Logger.info("nlMovieFetcher: " + message);
        }
    }

    private void logWarning(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.warning(message);
        } else {
            Logger.warning("nlMovieFetcher: " + message);
        }
    }

    private Resource json(String body) {
        StringResource response = new StringResource(body);
        response.addResponseHeader(
                HttpHeader.CONTENT_TYPE, "application/json; charset=utf-8");
        response.addResponseHeader("X-Content-Type-Options", "nosniff");
        response.addNoCacheResponseHeaders();
        return response;
    }

    private void field(
            StringBuilder json, String key, String value, boolean comma) {
        if (comma) {
            json.append(',');
        }
        json.append('\"').append(TextUtil.escapeJSON(key)).append("\":\"")
                .append(TextUtil.escapeJSON(value)).append('\"');
    }
}
