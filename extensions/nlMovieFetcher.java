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

import dareka.common.Logger;
import dareka.common.TextUtil;
import dareka.common.json.Json;
import dareka.common.json.JsonObject;
import dareka.common.json.JsonValue;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;

/**
 * 現行Domand/CMAF配信をNicoCache_nl自身のプロキシー経由で最後まで取得する。
 * 視聴権の取得はログイン状態を持つブラウザー側へ任せ、この拡張は署名済みURLだけを扱う。
 */
public final class nlMovieFetcher implements Extension2, Processor {
    public static final int REVISION = 260806;
    public static final String VER_STRING = "nlMovieFetcher_" + REVISION;

    private static final String API_PREFIX = "/cache/filter-matome/v1/movie-fetcher/";
    private static final String REQUIRED_HEADER = "X-Filter-Matome-Movie-Fetcher";
    private static final String[] METHODS = { "GET", "POST" };
    private static final Pattern API_URL = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp" + API_PREFIX
                    + "(capabilities|start|status|cancel)(?:\\?([^#]*))?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern VIDEO_ID = Pattern.compile(
            "^[a-z]{2}[0-9]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern URI_ATTRIBUTE = Pattern.compile(
            "(?:^|[:,])URI=\\\"([^\\\"]+)\\\"", Pattern.CASE_INSENSITIVE);
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
    private final ConcurrentHashMap<String, Thread> workers =
            new ConcurrentHashMap<>();
    private volatile SSLSocketFactory proxyTlsSocketFactory;

    @Override
    public void registerExtensions(ExtensionManager manager) {
        manager.registerProcessor(this);
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
        return StringResource.getNotFound();
    }

    private Resource start(HttpRequestHeader request, Socket browser)
            throws IOException {
        JsonObject body = readJsonObject(request, browser);
        if (body == null) {
            return StringResource.getBadRequest();
        }
        String videoId = stringValue(body, "videoId");
        String contentUrl = stringValue(body, "contentUrl");
        if (!validVideoId(videoId) || !isAllowedDomandUrl(contentUrl)) {
            return StringResource.getBadRequest();
        }
        videoId = videoId.toLowerCase(Locale.ROOT);
        Thread previous = workers.get(videoId);
        if (previous != null && previous.isAlive()) {
            return status(videoId);
        }

        final String jobVideoId = videoId;
        final String jobUrl = contentUrl;
        states.put(jobVideoId, "queued");
        completed.put(jobVideoId, 0);
        totals.put(jobVideoId, 0);
        errors.remove(jobVideoId);
        Thread worker = new Thread(
                () -> runJob(jobVideoId, jobUrl),
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
            worker.interrupt();
        }
        return status(videoId);
    }

    private void runJob(String videoId, String masterUrl) {
        try {
            states.put(videoId, "fetching");
            String master = fetchText(masterUrl);
            Set<String> playlists = extractUris(masterUrl, master);
            if (playlists.isEmpty()) {
                throw new IOException("master playlist has no child playlist");
            }

            Set<String> mediaResources = new LinkedHashSet<>();
            totals.put(videoId, playlists.size());
            for (String playlistUrl : playlists) {
                checkCanceled();
                String media = fetchText(playlistUrl);
                completed.merge(videoId, 1, Integer::sum);
                mediaResources.addAll(extractUris(playlistUrl, media));
            }
            if (mediaResources.isEmpty()) {
                throw new IOException("media playlist has no resources");
            }
            totals.put(videoId, playlists.size() + mediaResources.size());
            for (String resourceUrl : mediaResources) {
                checkCanceled();
                fetchBinary(resourceUrl);
                completed.merge(videoId, 1, Integer::sum);
            }
            states.put(videoId, "completed");
            Logger.info("nlMovieFetcher: completed " + videoId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            states.put(videoId, "canceled");
        } catch (IOException | RuntimeException exception) {
            states.put(videoId, "failed");
            errors.put(videoId, safeError(exception));
            Logger.warning("nlMovieFetcher: failed " + videoId + ": "
                    + exception.getClass().getSimpleName());
        } finally {
            workers.remove(videoId, Thread.currentThread());
        }
    }

    private String fetchText(String url) throws IOException, InterruptedException {
        byte[] bytes = fetch(url, MAX_PLAYLIST);
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private void fetchBinary(String url) throws IOException, InterruptedException {
        fetch(url, -1);
    }

    private byte[] fetch(String url, int maximum)
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

    private SSLSocketFactory getProxyTlsSocketFactory() throws IOException {
        SSLSocketFactory current = proxyTlsSocketFactory;
        if (current != null) {
            return current;
        }
        synchronized (this) {
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
            throw new IOException("playlist contains a disallowed URL");
        }
        result.add(url);
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
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null) {
                return false;
            }
            host = host.toLowerCase(Locale.ROOT);
            if (!("delivery.domand.nicovideo.jp".equals(host)
                    || "asset.domand.nicovideo.jp".equals(host))) {
                return false;
            }
            String path = uri.getPath();
            return path != null && (path.startsWith("/hlsbid/")
                    || path.startsWith("/shlsbid/")
                    || path.startsWith("/hlsext/")
                    || path.matches("/[a-f0-9]{24}/.*"));
        } catch (IllegalArgumentException exception) {
            return false;
        }
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
