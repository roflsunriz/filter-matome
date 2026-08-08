package extensions;
import java.io.*;
import java.net.*;
import java.nio.charset.*;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.security.*;
import java.time.*;
import java.time.temporal.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.regex.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import dareka.NLMain;
import dareka.common.*;
import dareka.common.json.*;
import dareka.extensions.*;
import dareka.processor.*;
/**
 * nlMovieFetcherの永続スケジュール、認証Cookie、帯域計画、履歴を管理する。
 * Cookieは暗号化した専用ファイルに保存し、状態JSONやAPI応答へ含めない。
 */
public final class FilterMatomeSmartFetcher
        implements Extension2, Processor, SystemEventListener {
    public static final int REVISION = 26080901; public static final String VER_STRING = "FilterMatomeSmartFetcher_" + REVISION;
    private static final String API_PREFIX = "/cache/filter-matome/v1/smart-fetcher/", REQUIRED_HEADER = "X-Filter-Matome-Smart-Fetcher";
    private static final Pattern API_URL = Pattern.compile( "^https?://www\\.nicovideo\\.jp" + API_PREFIX + "(state|schedule|settings|run-now|cancel|remove|credentials|clear-credentials)"
                    + "(?:\\?([^#]*))?$", Pattern.CASE_INSENSITIVE);
    private static final Pattern VIDEO_ID = Pattern.compile( "^[a-z]{2}[0-9]+$", Pattern.CASE_INSENSITIVE), COOKIE_NAME = Pattern.compile( "^(nicosid|domand_bid|user_session|user_session_secure)$"), SERVER_RESPONSE = Pattern.compile("(?is)<meta\\b(?=[^>]*\\bname=[\"']server-response[\"'])[^>]*\\bcontent=(?:\"([^\"]*)\"|'([^']*)')[^>]*>");
    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0 Safari/537.36", DATA_ROOT_PROPERTY = "nicocache.userDataRoot", CREDENTIAL_AAD = "filter-matome-smart-fetcher-v1";
    private static final String[] METHODS = { "GET", "POST" };
    private static final int SCHEMA_VERSION = 1, MAX_BODY = 128 * 1024, MAX_RESPONSE = 8 * 1024 * 1024, MAX_SCHEDULES = 500, CONNECT_TIMEOUT_MS = 20_000, READ_TIMEOUT_MS = 60_000;
    private final Object stateLock = new Object();
    private final List<Map<String, Object>> schedules = new ArrayList<>(), history = new ArrayList<>();
    private final Map<String, Object> settings = new LinkedHashMap<>();
    private final Map<Integer, Set<LocalDate>> holidayCache = new HashMap<>();
    private final AtomicBoolean tickRunning = new AtomicBoolean(false);
    private final ExecutorService executor = Executors.newSingleThreadExecutor( runnable -> {
                Thread thread = new Thread(runnable, "FilterMatomeSmartFetcher");
                thread.setDaemon(true);
                thread.setPriority(Thread.MIN_PRIORITY);
                return thread;
            });
    private final Path stateFile, credentialFile, keyFile;
    private volatile String encryptedCookie = "", activeScheduleId = "";
    private volatile long credentialsSavedAt;
    private volatile LoggerHandler extensionLogger;
    public FilterMatomeSmartFetcher() {
        String configured = System.getProperty(DATA_ROOT_PROPERTY);
        Path root = configured == null || configured.trim().isEmpty() ? Path.of(".").toAbsolutePath().normalize() : Path.of(configured).toAbsolutePath().normalize();
        Path data = root.resolve("data");
        stateFile = data.resolve("filter-matome-smart-fetcher.json");
        credentialFile = data.resolve( "filter-matome-smart-fetcher.credentials.json");
        keyFile = data.resolve("filter-matome-smart-fetcher.key");
        installDefaultSettings();
        loadState();
        loadCredentials();
        recoverInterruptedSchedules(); }
    @Override public void registerExtensions(ExtensionManager manager) {
        manager.registerProcessor(this);
        manager.registerEventListener(this);
        if (extensionLogger == null) extensionLogger = NLMain.getExtLogger( this, "smartFetcher", null, false);
    }
    @Override public String getVersionString() { return VER_STRING; }
    @Override public String[] getSupportedMethods() { return METHODS; }
    @Override public Pattern getSupportedURLAsPattern() { return API_URL; }
    @Override public String getSupportedURLAsString() { return null; }
    @Override public Resource onRequest(HttpRequestHeader request, Socket browser) throws IOException {
        Matcher matcher = API_URL.matcher(request.getURI());
        if (!matcher.matches() || !"1".equals(request.getMessageHeader(REQUIRED_HEADER))) {
            return StringResource.getNotFound(); }
        String action = matcher.group(1).toLowerCase(Locale.ROOT);
        if ("state".equals(action) && request.isGetMethod()) {
            return json(createStateJson()); }
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return StringResource.getMethodNotAllowed(); }
        captureCredentials(request.getMessageHeader("Cookie"));
        if ("credentials".equals(action)) {
            return json(createStateJson()); }
        if ("clear-credentials".equals(action)) {
            try {
                clearCredentials();
                return json(createStateJson());
            } catch (IllegalArgumentException exception) {
                logWarning("Cookie削除に失敗しました: " + safeError(exception));
                return StringResource.getBadRequest(); } }
        JsonObject body = readJsonObject(request, browser);
        if (body == null) {
            return StringResource.getBadRequest(); }
        try {
            if ("schedule".equals(action)) {
                upsertSchedule(body);
            } else if ("settings".equals(action)) {
                updateSettings(body);
            } else if ("run-now".equals(action)) {
                runNow(stringValue(body, "id"));
            } else if ("cancel".equals(action)) {
                cancelSchedule(stringValue(body, "id"));
            } else if ("remove".equals(action)) {
                removeSchedule(stringValue(body, "id"));
            } else {
                return StringResource.getNotFound(); }
            return json(createStateJson());
        } catch (IllegalArgumentException exception) {
            logWarning("設定要求を拒否しました: " + exception.getMessage());
            return StringResource.getBadRequest(); } }
    @Override public int onSystemEvent(int id, EventSource source) {
        if (id == PERIODIC_CALL) {
            scheduleTick();
        } else if (id == SYSTEM_EXIT) {
            executor.shutdownNow();
            synchronized (stateLock) {
                Map<String, Object> active = findSchedule(activeScheduleId);
                if (active != null) {
                    active.put("state", "interrupted");
                    active.put("lastError", "NicoCache_nlが終了しました");
                    active.put("updatedAt", System.currentTimeMillis());
                    saveState(); } } }
        return RESULT_OK; }
    private void installDefaultSettings() {
        settings.put("timeZone", ZoneId.systemDefault().getId());
        settings.put("bandwidthMode", "fixed");
        settings.put("fixedBytesPerSecond", 1024L * 1024L);
        settings.put("lineBytesPerSecond", 10L * 1024L * 1024L);
        settings.put("percentage", 20L);
        settings.put("measuredBytesPerSecond", 0L);
        settings.put("defaultWindowMinutes", 360L);
        settings.put("safetyPercent", 120L);
        settings.put("holidayCalendar", "japan");
        settings.put("maxHistory", 500L); }
    private void updateSettings(JsonObject body) {
        String zone = requiredString(body, "timeZone", 80);
        ZoneId.of(zone);
        String mode = requiredChoice(body, "bandwidthMode", "fixed", "percentage", "auto");
        long fixed = range(longValue(body, "fixedBytesPerSecond", -1L), 1024L, 1024L * 1024L * 1024L, "固定帯域");
        long line = range(longValue(body, "lineBytesPerSecond", -1L), 1024L, 10L * 1024L * 1024L * 1024L, "回線速度");
        long percentage = range(longValue(body, "percentage", -1L), 1L, 100L, "利用割合");
        long window = range(longValue(body, "defaultWindowMinutes", -1L), 1L, 10_080L, "既定ウィンドウ");
        long safety = range(longValue(body, "safetyPercent", -1L), 100L, 300L, "安全率");
        String calendar = requiredChoice(body, "holidayCalendar", "none", "japan");
        synchronized (stateLock) {
            settings.put("timeZone", zone);
            settings.put("bandwidthMode", mode);
            settings.put("fixedBytesPerSecond", fixed);
            settings.put("lineBytesPerSecond", line);
            settings.put("percentage", percentage);
            settings.put("defaultWindowMinutes", window);
            settings.put("safetyPercent", safety);
            settings.put("holidayCalendar", calendar);
            recomputeAdmission(System.currentTimeMillis());
            saveState(); } }
    private void upsertSchedule(JsonObject body) {
        String videoId = requiredString(body, "videoId", 32) .toLowerCase(Locale.ROOT);
        if (!VIDEO_ID.matcher(videoId).matches()) {
            throw new IllegalArgumentException("動画IDが不正です"); }
        String recurrence = requiredChoice(body, "recurrence", "once", "daily", "weekly", "monthly", "yearly");
        String holidayPolicy = requiredChoice(body, "holidayPolicy", "include", "exclude", "only");
        long startAt = range(longValue(body, "startAt", -1L), 1L, Long.MAX_VALUE, "開始日時");
        long estimatedBytes = range(longValue(body, "estimatedBytes", -1L), 1L, Long.MAX_VALUE / 4L, "推定サイズ");
        long now = System.currentTimeMillis();
        String requestedId = stringValue(body, "id");
        synchronized (stateLock) {
            Map<String, Object> schedule = findSchedule(requestedId);
            if (schedule == null) {
                if (schedules.size() >= MAX_SCHEDULES) {
                    throw new IllegalArgumentException("予約件数が上限です"); }
                schedule = new LinkedHashMap<>();
                schedule.put("id", UUID.randomUUID().toString());
                schedule.put("createdAt", now);
                schedules.add(schedule); }
            schedule.put("videoId", videoId);
            schedule.put("title", optionalString(body, "title", 200));
            schedule.put("recurrence", recurrence);
            schedule.put("startAt", startAt);
            schedule.put("windowMinutes", range(longValue(body, "windowMinutes", longSetting("defaultWindowMinutes")), 1L, 10_080L, "取得可能時間"));
            schedule.put("daysOfWeek", range(longValue(body, "daysOfWeek", dayMask(startAt)), 1L, 127L, "曜日"));
            schedule.put("holidayPolicy", holidayPolicy);
            schedule.put("enabled", booleanValue(body, "enabled", true));
            schedule.put("priority", range(longValue(body, "priority", 5L), 0L, 9L, "優先度"));
            schedule.put("estimatedBytes", estimatedBytes);
            schedule.put("maxRetries", range(longValue(body, "maxRetries", 2L), 0L, 10L, "再試行回数"));
            schedule.put("retryCount", 0L);
            schedule.put("lastError", "");
            schedule.put("lastRunAt", 0L);
            schedule.put("updatedAt", now);
            long next = nextOccurrence(schedule, now - 1L);
            if (next == 0L) {
                schedule.put("enabled", false);
                schedule.put("state", "expired");
            } else {
                schedule.put("nextRunAt", next);
                schedule.put("state", "scheduled"); }
            recomputeAdmission(now);
            saveState(); }
        scheduleTick(); }
    private void runNow(String id) {
        synchronized (stateLock) {
            Map<String, Object> schedule = requireSchedule(id);
            schedule.put("enabled", true);
            schedule.put("nextRunAt", System.currentTimeMillis());
            schedule.put("state", "scheduled");
            schedule.put("retryCount", 0L);
            schedule.put("updatedAt", System.currentTimeMillis());
            recomputeAdmission(System.currentTimeMillis());
            saveState(); }
        scheduleTick(); }
    private void cancelSchedule(String id) {
        synchronized (stateLock) {
            Map<String, Object> schedule = requireSchedule(id);
            schedule.put("enabled", false);
            schedule.put("state", id.equals(activeScheduleId) ? "canceling" : "canceled");
            schedule.put("updatedAt", System.currentTimeMillis());
            saveState(); } }
    private void removeSchedule(String id) {
        synchronized (stateLock) {
            if (id != null && id.equals(activeScheduleId)) {
                throw new IllegalArgumentException( "取得中の予約は中止してから削除してください"); }
            boolean removed = schedules.removeIf( schedule -> id != null && id.equals(text(schedule, "id")));
            if (!removed) {
                throw new IllegalArgumentException("予約が見つかりません"); }
            recomputeAdmission(System.currentTimeMillis());
            saveState(); } }
    private void scheduleTick() {
        if (!tickRunning.compareAndSet(false, true)) {
            return; }
        executor.execute(() -> {
            try {
                processNextDue();
            } finally {
                tickRunning.set(false);
                if (hasDueSchedule()) scheduleTick(); }
        }); }
    private boolean hasDueSchedule() {
        synchronized (stateLock) {
            long now = System.currentTimeMillis();
            return schedules.stream().anyMatch(schedule -> bool(schedule, "enabled") && "scheduled".equals(text(schedule, "state")) && number(schedule, "nextRunAt") <= now); } }
    private void processNextDue() {
        Map<String, Object> target = null;
        long now = System.currentTimeMillis();
        synchronized (stateLock) {
            expireMissedSchedules(now);
            recomputeAdmission(now);
            for (Map<String, Object> schedule : schedules) {
                if (bool(schedule, "enabled") && "scheduled".equals(text(schedule, "state")) && number(schedule, "nextRunAt") <= now && (target == null || compareSchedules( schedule, target) < 0)) {
                    target = schedule; } }
            if (target == null) {
                saveState();
                return; }
            target.put("state", "running");
            target.put("lastRunAt", now);
            target.put("updatedAt", now);
            activeScheduleId = text(target, "id");
            saveState(); }
        executeSchedule(activeScheduleId);
        activeScheduleId = "";
        synchronized (stateLock) {
            recomputeAdmission(System.currentTimeMillis());
            saveState(); }
    }
    private int compareSchedules(Map<String, Object> left, Map<String, Object> right) {
        int byTime = Long.compare(number(left, "nextRunAt"), number(right, "nextRunAt"));
        return byTime != 0 ? byTime : Long.compare( number(right, "priority"), number(left, "priority")); }
    private void executeSchedule(String id) {
        Map<String, Object> snapshot;
        synchronized (stateLock) {
            Map<String, Object> source = findSchedule(id);
            if (source == null) {
                return; }
            snapshot = new LinkedHashMap<>(source); }
        long deadline = number(snapshot, "nextRunAt") + number(snapshot, "windowMinutes") * 60_000L;
        long maximumRate = downloadRate();
        String finalState = "failed";
        String error = "";
        long actualBytes = 0L;
        long startedAt = System.currentTimeMillis();
        int maximumRetries = (int) number(snapshot, "maxRetries");
        for (int attempt = 0; attempt <= maximumRetries; attempt++) {
            try {
                if (System.currentTimeMillis() >= deadline) {
                    throw new IOException("取得可能時間を超過しました"); }
                String cookie = decryptCookie();
                Map<String, Object> prepared = prepareDelivery( text(snapshot, "videoId"), cookie);
                startDownloader(text(snapshot, "videoId"), text(prepared, "contentUrl"), cookie, maximumRate);
                Map<String, Object> status = waitForDownloader( id, text(snapshot, "videoId"), deadline, cookie);
                actualBytes = number(status, "bytesTransferred");
                String downloaderState = text(status, "status");
                long completedResources = number(status, "completed");
                long totalResources = number(status, "total");
                if ("completed".equals(downloaderState) && totalResources > 0L && completedResources == totalResources && actualBytes > 0L) {
                    finalState = "completed";
                    error = "";
                    break; }
                if ("completed".equals(downloaderState)) {
                    throw new IOException("取得結果が不完全です (" + completedResources + "/" + totalResources + ")"); }
                if ("canceled".equals(downloaderState)) {
                    finalState = "canceled";
                    error = "利用者が中止しました";
                    break; }
                throw new IOException(text(status, "error").isEmpty() ? "nlMovieFetcherが失敗しました" : text(status, "error"));
            } catch (Exception exception) {
                error = safeError(exception);
                synchronized (stateLock) {
                    Map<String, Object> current = findSchedule(id);
                    if (current == null || !bool(current, "enabled")) {
                        finalState = "canceled";
                        error = "利用者が中止しました";
                        break; }
                    current.put("retryCount", (long) attempt + 1L);
                    current.put("lastError", error);
                    current.put("updatedAt", System.currentTimeMillis());
                    saveState(); }
                if (attempt >= maximumRetries) {
                    break; }
                try {
                    Thread.sleep(Math.min(30_000L, 2_000L * (1L << Math.min(attempt, 4))));
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    finalState = "interrupted";
                    error = "NicoCache_nlが終了しました";
                    break; } } }
        finishOccurrence(id, finalState, error, actualBytes, startedAt, maximumRate); }
    private Map<String, Object> waitForDownloader(String scheduleId, String videoId, long deadline, String cookie) throws Exception {
        while (System.currentTimeMillis() < deadline) {
            synchronized (stateLock) {
                Map<String, Object> current = findSchedule(scheduleId);
                if (current == null || !bool(current, "enabled")) {
                    callDownloader("cancel", "POST", videoId, null, cookie, 0L); } }
            JsonObject status = callDownloader("status?videoId=" + videoId, "GET", videoId, null, cookie, 0L);
            String state = Json.getString(status, "status");
            if ("completed".equals(state) || "failed".equals(state) || "canceled".equals(state) || "idle".equals(state)) {
                return jsonToMap(status); }
            Thread.sleep(1_000L); }
        callDownloader("cancel", "POST", videoId, null, cookie, 0L);
        throw new IOException("取得可能時間を超過しました"); }
    private void startDownloader(String videoId, String contentUrl, String cookie, long maximumRate) throws Exception {
        callDownloader("start", "POST", videoId, contentUrl, cookie, maximumRate); }
    private JsonObject callDownloader(String action, String method, String videoId, String contentUrl, String cookie, long rate) throws Exception {
        int port = Integer.getInteger("listenPort", 8080);
        Proxy proxy = new Proxy(Proxy.Type.HTTP, new InetSocketAddress("127.0.0.1", port));
        URL url = new URL("http://www.nicovideo.jp/cache/filter-matome/v1/" + "movie-fetcher/" + action);
        HttpURLConnection connection = (HttpURLConnection)
                url.openConnection(proxy);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestMethod(method);
        connection.setRequestProperty( "X-Filter-Matome-Movie-Fetcher", "1");
        connection.setRequestProperty("Connection", "close");
        if (!cookie.isEmpty()) {
            connection.setRequestProperty("Cookie", cookie); }
        if ("POST".equals(method)) {
            StringBuilder body = new StringBuilder("{\"videoId\":\"") .append(TextUtil.escapeJSON(videoId)).append('"');
            if (contentUrl != null) {
                body.append(",\"contentUrl\":\"") .append(TextUtil.escapeJSON(contentUrl)).append('"') .append(",\"maxBytesPerSecond\":").append(rate); }
            body.append('}');
            writeBody(connection, body.toString()); }
        return readJsonResponse(connection, false); }
    private Map<String, Object> prepareDelivery(String videoId, String cookie) throws Exception {
        String actionTrackId = UUID.randomUUID().toString().replace("-", "") .substring(0, 10) + "_" + System.currentTimeMillis();
        String query = "?_frontendId=6&_frontendVersion=0&actionTrackId=" + actionTrackId + "&t=" + System.currentTimeMillis();
        Map<String, String> watchHeaders = new LinkedHashMap<>();
        watchHeaders.put("X-Frontend-Id", "6");
        watchHeaders.put("X-Frontend-Version", "0");
        if (!cookie.isEmpty()) {
            watchHeaders.put("Cookie", cookie); }
        JsonObject watchEnvelope;
        try {
            watchEnvelope = requestJson( "https://www.nicovideo.jp/api/watch/v3/" + videoId + query, "GET", watchHeaders, null, true);
        } catch (IOException exception) {
            watchEnvelope = requestWatchPage(videoId, cookie); }
        long status = jsonLong(watchEnvelope, "_httpStatus", 0L);
        String errorCode = Json.getString(watchEnvelope, "meta", "errorCode");
        if (status == 401L || (status == 400L && "UNAUTHORIZED".equals(errorCode))) {
            watchEnvelope = requestJson( "https://www.nicovideo.jp/api/watch/v3_guest/" + videoId + query, "GET", watchHeaders, null, false);
        } else if (status < 200L || status >= 300L) {
            throw new IOException("watch API: HTTP " + status + (errorCode == null ? "" : " (" + errorCode + ")")); }
        JsonObject watch = watchEnvelope.getObject("data", "response");
        if (watch == null) {
            watch = watchEnvelope.getObject("data"); }
        JsonObject domand = watch == null ? null : watch.getObject("media", "domand");
        String accessKey = domand == null ? null : Json.getString(domand, "accessRightKey");
        String videoQuality = selectBestQuality( domand == null ? null : domand.getArray("videos"));
        String audioQuality = selectBestQuality( domand == null ? null : domand.getArray("audios"));
        if (accessKey == null || videoQuality == null || audioQuality == null) {
            throw new IOException("利用可能なDomand配信がありません"); }
        String watchTrackId = Json.getString(watch, "client", "watchTrackId");
        if (watchTrackId == null) {
            watchTrackId = actionTrackId; }
        Map<String, String> accessHeaders = new LinkedHashMap<>();
        accessHeaders.put("Content-Type", "application/json");
        accessHeaders.put("X-Access-Right-Key", accessKey);
        accessHeaders.put("X-Frontend-Id", "6");
        accessHeaders.put("X-Frontend-Version", "0");
        accessHeaders.put("X-Request-With", "https://www.nicovideo.jp");
        accessHeaders.put("Origin", "https://www.nicovideo.jp");
        accessHeaders.put("Referer", "https://www.nicovideo.jp/watch/" + videoId);
        if (!cookie.isEmpty()) accessHeaders.put("Cookie", cookie);
        String accessBody = "{\"outputs\":[[\"" + TextUtil.escapeJSON(videoQuality) + "\",\"" + TextUtil.escapeJSON(audioQuality) + "\"]]}";
        JsonObject access = requestJson( "https://nvapi.nicovideo.jp/v1/watch/" + videoId + "/access-rights/hls?actionTrackId="
                        + java.net.URLEncoder.encode(watchTrackId, StandardCharsets.UTF_8), "POST", accessHeaders, accessBody, false);
        String contentUrl = Json.getString(access, "data", "contentUrl");
        if (contentUrl == null || !contentUrl.startsWith( "https://delivery.domand.nicovideo.jp/")) {
            throw new IOException("配信URLを取得できませんでした"); }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("contentUrl", contentUrl);
        return result; }
    private String selectBestQuality(JsonArray candidates) {
        JsonObject best = null;
        long bestLevel = -1L;
        long bestBitRate = -1L;
        if (candidates == null) {
            return null; }
        for (JsonValue value : candidates.getList()) {
            if (!(value instanceof JsonObject)) {
                continue; }
            JsonObject candidate = (JsonObject) value;
            String id = Json.getString(candidate, "id");
            if (!candidate.getBoolean("isAvailable") || id == null) {
                continue; }
            long level = jsonLong(candidate, "qualityLevel", -1L);
            long bitRate = jsonLong(candidate, "bitRate", -1L);
            if (best == null || level > bestLevel || (level == bestLevel && bitRate > bestBitRate)) {
                best = candidate;
                bestLevel = level;
                bestBitRate = bitRate; } }
        return best == null ? null : Json.getString(best, "id"); }
    private JsonObject requestJson(String url, String method, Map<String, String> headers, String body, boolean permitError) throws Exception {
        HttpURLConnection connection = (HttpURLConnection)
                new URL(url).openConnection(Proxy.NO_PROXY);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestMethod(method);
        connection.setRequestProperty("User-Agent", USER_AGENT);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Accept-Language", "ja-JP,ja;q=0.9,en;q=0.5");
        connection.setRequestProperty("Connection", "close");
        for (Map.Entry<String, String> header : headers.entrySet()) {
            connection.setRequestProperty(header.getKey(), header.getValue()); }
        if (body != null) {
            writeBody(connection, body); }
        return readJsonResponse(connection, permitError); }
    private JsonObject requestWatchPage(String videoId, String cookie) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL("https://www.nicovideo.jp/watch/" + videoId).openConnection(Proxy.NO_PROXY);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestProperty("User-Agent", USER_AGENT);
        connection.setRequestProperty("Accept", "text/html");
        connection.setRequestProperty("Accept-Encoding", "identity");
        if (!cookie.isEmpty()) connection.setRequestProperty("Cookie", cookie);
        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) throw new IOException("watch page: HTTP " + status);
            Matcher match = SERVER_RESPONSE.matcher(readLimited(connection.getInputStream(), MAX_RESPONSE));
            if (!match.find()) throw new IOException("watch pageにserver-responseがありません");
            String content = TextUtil.unescapeHTML(match.group(1) != null ? match.group(1) : match.group(2)).trim();
            if (!content.startsWith("{")) content = URLDecoder.decode(content, StandardCharsets.UTF_8);
            JsonObject object = Json.parseObject(content);
            if (object == null) throw new IOException("server-responseが不正です");
            object.put("_httpStatus", new JsonNumber(200));
            return object;
        } finally {
            connection.disconnect(); } }
    private void writeBody(HttpURLConnection connection, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        connection.setDoOutput(true);
        connection.setFixedLengthStreamingMode(bytes.length);
        connection.setRequestProperty("Content-Type", "application/json");
        try (OutputStream output = connection.getOutputStream()) {
            output.write(bytes); } }
    private JsonObject readJsonResponse(HttpURLConnection connection, boolean permitError) throws IOException {
        try {
            int status = connection.getResponseCode();
            InputStream source = status >= 200 && status < 300 ? connection.getInputStream() : connection.getErrorStream();
            String body = source == null ? "{}" : readLimited(source, MAX_RESPONSE);
            JsonObject object = Json.parseObject(body);
            if (object == null) {
                throw new IOException("upstream HTTP " + status + " returned non-JSON (" + connection.getContentType() + ")"); }
            object.put("_httpStatus", new JsonNumber(status));
            if (!permitError && (status < 200 || status >= 300)) {
                String code = Json.getString(object, "meta", "errorCode");
                throw new IOException("upstream HTTP " + status + (code == null ? "" : " (" + code + ")")); }
            return object;
        } finally {
            connection.disconnect(); } }
    private String readLimited(InputStream input, int maximum) throws IOException {
        try (InputStream source = input;
                ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[16 * 1024];
            int total = 0;
            int read;
            while ((read = source.read(buffer)) >= 0) {
                total += read;
                if (total > maximum) {
                    throw new IOException("HTTP応答が大きすぎます"); }
                output.write(buffer, 0, read); }
            return output.toString(StandardCharsets.UTF_8); } }
    private void finishOccurrence(String id, String finalState, String error, long actualBytes, long startedAt, long maximumRate) {
        long finishedAt = System.currentTimeMillis();
        synchronized (stateLock) {
            Map<String, Object> schedule = findSchedule(id);
            if (schedule == null) {
                return; }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("id", UUID.randomUUID().toString());
            entry.put("scheduleId", id);
            entry.put("videoId", text(schedule, "videoId"));
            entry.put("title", text(schedule, "title"));
            entry.put("state", finalState);
            entry.put("error", error);
            entry.put("estimatedBytes", number(schedule, "estimatedBytes"));
            entry.put("actualBytes", actualBytes);
            entry.put("startedAt", startedAt);
            entry.put("finishedAt", finishedAt);
            history.add(0, entry);
            int maximum = (int) longSetting("maxHistory");
            while (history.size() > maximum) {
                history.remove(history.size() - 1); }
            schedule.put("lastError", error);
            schedule.put("retryCount", 0L);
            schedule.put("updatedAt", finishedAt);
            updateMeasuredRate(actualBytes, finishedAt - startedAt, maximumRate);
            if (bool(schedule, "enabled") && !"once".equals(text(schedule, "recurrence"))) {
                long next = nextOccurrence(schedule, number(schedule, "nextRunAt") + 1L);
                schedule.put("nextRunAt", next);
                schedule.put("state", next == 0L ? "expired" : "scheduled");
                if (next == 0L) {
                    schedule.put("enabled", false); }
            } else {
                schedule.put("enabled", false);
                schedule.put("state", finalState); }
            saveState(); }
        if ("completed".equals(finalState)) {
            logInfo(textFromSchedule(id, "videoId") + ": 予約取得完了");
        } else {
            logWarning(textFromSchedule(id, "videoId") + ": 予約取得" + finalState + ": " + error); } }
    private void updateMeasuredRate(long bytes, long elapsedMillis, long maximumRate) {
        if (bytes <= 0L || elapsedMillis <= 0L || maximumRate > 0L || !"auto".equals(text(settings, "bandwidthMode"))) {
            return; }
        long observed = bytes * 1000L / elapsedMillis;
        long previous = longSetting("measuredBytesPerSecond");
        settings.put("measuredBytesPerSecond", previous <= 0L ? observed : (previous * 3L + observed) / 4L); }
    private long effectiveRate() {
        synchronized (stateLock) {
            String mode = text(settings, "bandwidthMode");
            if ("fixed".equals(mode)) {
                return longSetting("fixedBytesPerSecond"); }
            long base = "auto".equals(mode) && longSetting("measuredBytesPerSecond") > 0L ? longSetting("measuredBytesPerSecond") : longSetting("lineBytesPerSecond");
            return Math.max(1024L, base * longSetting("percentage") / 100L); } }
    private long downloadRate() {
        synchronized (stateLock) {
            return "auto".equals(text(settings, "bandwidthMode")) && longSetting("measuredBytesPerSecond") <= 0L ? 0L : effectiveRate(); } }
    private void recomputeAdmission(long now) {
        long rate = effectiveRate();
        long cursor = now;
        List<Map<String, Object>> ordered = new ArrayList<>();
        for (Map<String, Object> schedule : schedules) {
            if (bool(schedule, "enabled") && !"running".equals(text(schedule, "state")) && !"canceling".equals(text(schedule, "state"))) {
                ordered.add(schedule); } }
        ordered.sort(this::compareSchedules);
        for (Map<String, Object> schedule : ordered) {
            long release = number(schedule, "nextRunAt");
            long deadline = release + number(schedule, "windowMinutes") * 60_000L;
            long estimate = number(schedule, "estimatedBytes")
                    * longSetting("safetyPercent") / 100L;
            long duration = estimate > Long.MAX_VALUE / 1000L ? Long.MAX_VALUE : (estimate * 1000L + rate - 1L) / rate;
            cursor = Math.max(cursor, release);
            if (duration == Long.MAX_VALUE || cursor > deadline - duration) {
                schedule.put("state", "capacity-rejected");
                schedule.put("lastError", "取得可能時間内に完了できない見込みです");
            } else {
                if ("capacity-rejected".equals(text(schedule, "state"))) {
                    schedule.put("lastError", ""); }
                schedule.put("state", "scheduled");
                cursor += duration; } } }
    private void expireMissedSchedules(long now) {
        List<Map<String, Object>> missed = new ArrayList<>();
        for (Map<String, Object> schedule : schedules) {
            long deadline = number(schedule, "nextRunAt") + number(schedule, "windowMinutes") * 60_000L;
            if (bool(schedule, "enabled") && deadline < now && !"running".equals(text(schedule, "state"))) {
                missed.add(schedule); } }
        for (Map<String, Object> schedule : missed) {
            finishOccurrence(text(schedule, "id"), "failed", "取得可能時間を過ぎました", 0L, now, 0L); } }
    private long nextOccurrence(Map<String, Object> schedule, long after) {
        ZoneId zone = ZoneId.of(text(settings, "timeZone"));
        ZonedDateTime base = Instant.ofEpochMilli( number(schedule, "startAt")).atZone(zone);
        String recurrence = text(schedule, "recurrence");
        if ("once".equals(recurrence)) {
            return base.toInstant().toEpochMilli() > after && holidayAllowed(schedule, base.toLocalDate()) ? base.toInstant().toEpochMilli() : 0L; }
        ZonedDateTime cursor = Instant.ofEpochMilli(Math.max(after + 1L, base.toInstant().toEpochMilli())).atZone(zone);
        LocalDate date = cursor.toLocalDate();
        LocalTime time = base.toLocalTime().withSecond(0).withNano(0);
        for (int index = 0; index < 3700; index++) {
            LocalDate candidateDate = date.plusDays(index);
            if (matchesRecurrence(schedule, recurrence, base.toLocalDate(), candidateDate) && holidayAllowed(schedule, candidateDate)) {
                long candidate = ZonedDateTime.of(candidateDate, time, zone) .toInstant().toEpochMilli();
                if (candidate > after) {
                    return candidate; } } }
        return 0L; }
    private boolean matchesRecurrence(Map<String, Object> schedule, String recurrence, LocalDate base, LocalDate candidate) {
        if (candidate.isBefore(base)) {
            return false; }
        if ("daily".equals(recurrence)) {
            return true; }
        if ("weekly".equals(recurrence)) {
            long mask = number(schedule, "daysOfWeek");
            return (mask & (1L << (candidate.getDayOfWeek().getValue() - 1)))
                    != 0L; }
        if ("monthly".equals(recurrence)) {
            int day = Math.min(base.getDayOfMonth(), YearMonth.from(candidate).lengthOfMonth());
            return candidate.getDayOfMonth() == day; }
        return "yearly".equals(recurrence) && candidate.getMonth() == base.getMonth() && candidate.getDayOfMonth() == base.getDayOfMonth(); }
    private boolean holidayAllowed(Map<String, Object> schedule, LocalDate date) {
        String policy = text(schedule, "holidayPolicy");
        if ("include".equals(policy)) {
            return true; }
        boolean holiday = isHoliday(date);
        return "only".equals(policy) ? holiday : !holiday; }
    private boolean isHoliday(LocalDate date) {
        if (!"japan".equals(text(settings, "holidayCalendar"))) {
            return false; }
        return japaneseHolidays(date.getYear()).contains(date); }
    private Set<LocalDate> japaneseHolidays(int year) {
        Set<LocalDate> cached = holidayCache.get(year);
        if (cached != null) {
            return cached; }
        Set<LocalDate> days = new HashSet<>();
        addHoliday(days, year, 1, 1);
        days.add(nthWeekday(year, 1, DayOfWeek.MONDAY, 2));
        addHoliday(days, year, 2, 11);
        if (year >= 2020) addHoliday(days, year, 2, 23);
        addHoliday(days, year, 3, vernalEquinox(year));
        addHoliday(days, year, 4, 29);
        addHoliday(days, year, 5, 3);
        addHoliday(days, year, 5, 4);
        addHoliday(days, year, 5, 5);
        if (year == 2020) addHoliday(days, year, 7, 23);
        else if (year == 2021) addHoliday(days, year, 7, 22);
        else days.add(nthWeekday(year, 7, DayOfWeek.MONDAY, 3));
        if (year == 2020) addHoliday(days, year, 7, 24);
        else if (year == 2021) addHoliday(days, year, 7, 23);
        else days.add(nthWeekday(year, 10, DayOfWeek.MONDAY, 2));
        if (year == 2020) addHoliday(days, year, 8, 10);
        else if (year == 2021) addHoliday(days, year, 8, 8);
        else addHoliday(days, year, 8, 11);
        days.add(nthWeekday(year, 9, DayOfWeek.MONDAY, 3));
        addHoliday(days, year, 9, autumnEquinox(year));
        addHoliday(days, year, 11, 3);
        addHoliday(days, year, 11, 23);
        for (LocalDate date = LocalDate.of(year, 1, 2);
                date.isBefore(LocalDate.of(year, 12, 31));
                date = date.plusDays(1)) {
            if (!days.contains(date) && days.contains(date.minusDays(1)) && days.contains(date.plusDays(1))) {
                days.add(date); } }
        List<LocalDate> originals = new ArrayList<>(days);
        Collections.sort(originals);
        for (LocalDate holiday : originals) {
            if (holiday.getDayOfWeek() == DayOfWeek.SUNDAY) {
                LocalDate substitute = holiday.plusDays(1);
                while (days.contains(substitute)) substitute = substitute.plusDays(1);
                days.add(substitute); } }
        holidayCache.put(year, days);
        return days; }
    private LocalDate nthWeekday(int year, int month, DayOfWeek day, int nth) {
        return LocalDate.of(year, month, 1) .with(TemporalAdjusters.dayOfWeekInMonth(nth, day)); }
    private int vernalEquinox(int year) {
        return (int) Math.floor(20.8431 + 0.242194 * (year - 1980)
                - Math.floor((year - 1980) / 4.0)); }
    private int autumnEquinox(int year) {
        return (int) Math.floor(23.2488 + 0.242194 * (year - 1980)
                - Math.floor((year - 1980) / 4.0)); }
    private void addHoliday(Set<LocalDate> days, int year, int month, int day) {
        days.add(LocalDate.of(year, month, day)); }
    private long dayMask(long epochMillis) {
        ZoneId zone = ZoneId.of(text(settings, "timeZone"));
        int day = Instant.ofEpochMilli(epochMillis).atZone(zone) .getDayOfWeek().getValue();
        return 1L << (day - 1); }
    private void captureCredentials(String header) {
        String selected = selectCookies(header);
        if (selected.isEmpty()) {
            return; }
        try {
            saveEncryptedCookie(selected);
            logInfo("ブラウザー認証情報を安全な保存領域へ更新しました");
        } catch (Exception exception) {
            logWarning("認証情報の保存に失敗しました: " + exception.getClass().getSimpleName()); } }
    private String selectCookies(String header) {
        if (header == null || header.length() > 32 * 1024 || header.indexOf('\r') >= 0 || header.indexOf('\n') >= 0) {
            return ""; }
        StringBuilder selected = new StringBuilder();
        for (String part : header.split(";")) {
            String cookie = part.trim();
            int separator = cookie.indexOf('=');
            if (separator <= 0) continue;
            String name = cookie.substring(0, separator).trim();
            if (!COOKIE_NAME.matcher(name).matches()) continue;
            if (selected.length() > 0) selected.append("; ");
            selected.append(cookie); }
        return selected.toString(); }
    private void saveEncryptedCookie(String cookie) throws Exception {
        Files.createDirectories(credentialFile.getParent());
        SecretKey key = loadOrCreateKey();
        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, iv));
        cipher.updateAAD(CREDENTIAL_AAD.getBytes(StandardCharsets.UTF_8));
        byte[] encrypted = cipher.doFinal( cookie.getBytes(StandardCharsets.UTF_8));
        long savedAt = System.currentTimeMillis();
        String document = "{\"schemaVersion\":1,\"savedAt\":" + savedAt + ",\"iv\":\"" + Base64.getEncoder().encodeToString(iv) + "\",\"ciphertext\":\"" + Base64.getEncoder().encodeToString(encrypted) + "\"}";
        atomicWrite(credentialFile, document, true);
        encryptedCookie = document;
        credentialsSavedAt = savedAt; }
    private SecretKey loadOrCreateKey() throws Exception {
        if (Files.isRegularFile(keyFile)) {
            byte[] bytes = Base64.getDecoder().decode( Files.readString(keyFile, StandardCharsets.US_ASCII).trim());
            if (bytes.length != 32) throw new IOException("invalid key");
            return new SecretKeySpec(bytes, "AES"); }
        KeyGenerator generator = KeyGenerator.getInstance("AES");
        generator.init(256);
        SecretKey key = generator.generateKey();
        atomicWrite(keyFile, Base64.getEncoder().encodeToString( key.getEncoded()), true);
        return key; }
    private String decryptCookie() throws Exception {
        if (encryptedCookie.isEmpty()) {
            throw new IOException("保存済みCookieがありません"); }
        JsonObject document = Json.parseObject(encryptedCookie);
        if (document == null || jsonLong(document, "schemaVersion", 0L) != 1L) {
            throw new IOException("認証情報の保存形式が不正です"); }
        byte[] iv = Base64.getDecoder().decode( Json.getString(document, "iv"));
        byte[] encrypted = Base64.getDecoder().decode( Json.getString(document, "ciphertext"));
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, loadOrCreateKey(), new GCMParameterSpec(128, iv));
        cipher.updateAAD(CREDENTIAL_AAD.getBytes(StandardCharsets.UTF_8));
        return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8); }
    private void loadCredentials() {
        if (!Files.isRegularFile(credentialFile)) return;
        try {
            encryptedCookie = Files.readString( credentialFile, StandardCharsets.UTF_8);
            JsonObject object = Json.parseObject(encryptedCookie);
            credentialsSavedAt = jsonLong(object, "savedAt", 0L);
            decryptCookie();
        } catch (Exception exception) {
            encryptedCookie = "";
            credentialsSavedAt = 0L;
            backupBroken(credentialFile);
            backupBroken(keyFile);
            logWarning("保存済み認証情報を復元できませんでした"); } }
    private void clearCredentials() {
        encryptedCookie = "";
        credentialsSavedAt = 0L;
        try {
            Files.deleteIfExists(credentialFile);
            Files.deleteIfExists(keyFile);
            logInfo("保存済み認証情報を削除しました");
        } catch (IOException exception) {
            throw new IllegalArgumentException("認証情報を削除できませんでした"); } }
    private void recoverInterruptedSchedules() {
        synchronized (stateLock) {
            long now = System.currentTimeMillis();
            for (Map<String, Object> schedule : schedules) {
                String state = text(schedule, "state");
                if ("running".equals(state) || "canceling".equals(state) || "interrupted".equals(state)) {
                    schedule.put("state", "scheduled");
                    schedule.put("nextRunAt", now);
                    schedule.put("lastError", "再起動後に取得を再開します"); } }
            recomputeAdmission(now);
            saveState(); } }
    private void loadState() {
        if (!Files.isRegularFile(stateFile)) return;
        try {
            JsonObject root = Json.parseObject(Files.readString( stateFile, StandardCharsets.UTF_8));
            if (root == null || jsonLong(root, "schemaVersion", 0L) != SCHEMA_VERSION) {
                throw new IllegalArgumentException("未対応の保存形式です"); }
            JsonObject savedSettings = root.getObject("settings");
            if (savedSettings != null) loadSettings(savedSettings);
            JsonArray savedSchedules = root.getArray("schedules");
            JsonArray savedHistory = root.getArray("history");
            synchronized (stateLock) {
                schedules.clear();
                history.clear();
                if (savedSchedules != null) {
                    if (savedSchedules.size() > MAX_SCHEDULES) {
                        throw new IllegalArgumentException("予約件数が不正です"); }
                    for (JsonValue value : savedSchedules.getList()) {
                        if (!(value instanceof JsonObject)) throw new IllegalArgumentException();
                        Map<String, Object> schedule = jsonToMap( (JsonObject) value);
                        validateLoadedSchedule(schedule);
                        schedules.add(schedule); } }
                if (savedHistory != null) {
                    for (JsonValue value : savedHistory.getList()) {
                        if (value instanceof JsonObject) {
                            history.add(jsonToMap((JsonObject) value)); } } } }
        } catch (Exception exception) {
            schedules.clear();
            history.clear();
            backupBroken(stateFile);
            logWarning("保存済み予約を復元できませんでした"); } }
    private void loadSettings(JsonObject object) {
        putIfString(object, "timeZone");
        putIfString(object, "bandwidthMode");
        putIfString(object, "holidayCalendar");
        putIfNumber(object, "fixedBytesPerSecond");
        putIfNumber(object, "lineBytesPerSecond");
        putIfNumber(object, "percentage");
        putIfNumber(object, "measuredBytesPerSecond");
        putIfNumber(object, "defaultWindowMinutes");
        putIfNumber(object, "safetyPercent");
        putIfNumber(object, "maxHistory");
        ZoneId.of(text(settings, "timeZone"));
        if (!("fixed".equals(text(settings, "bandwidthMode")) || "percentage".equals(text(settings, "bandwidthMode")) || "auto".equals(text(settings, "bandwidthMode"))) || !("none".equals(text(settings, "holidayCalendar")) || "japan".equals(text(settings, "holidayCalendar"))) || longSetting("fixedBytesPerSecond") < 1024L || longSetting("lineBytesPerSecond") < 1024L || longSetting("percentage") < 1L || longSetting("percentage") > 100L || longSetting("defaultWindowMinutes") < 1L || longSetting("defaultWindowMinutes") > 10_080L || longSetting("safetyPercent") < 100L || longSetting("safetyPercent") > 300L || longSetting("measuredBytesPerSecond") < 0L || longSetting("maxHistory") < 1L || longSetting("maxHistory") > 10_000L) throw new IllegalArgumentException("保存設定の値が不正です"); }
    private void validateLoadedSchedule(Map<String, Object> schedule) {
        String id = text(schedule, "id");
        String videoId = text(schedule, "videoId");
        String recurrence = text(schedule, "recurrence");
        if (id.isEmpty() || !VIDEO_ID.matcher(videoId).matches() || !("once".equals(recurrence) || "daily".equals(recurrence) || "weekly".equals(recurrence) || "monthly".equals(recurrence) || "yearly".equals(recurrence))
                || number(schedule, "startAt") <= 0L || number(schedule, "estimatedBytes") <= 0L || number(schedule, "windowMinutes") <= 0L) {
            throw new IllegalArgumentException("保存予約の値が不正です"); } }
    private void saveState() {
        try {
            atomicWrite(stateFile, createStateDocument(), false);
        } catch (IOException exception) {
            logWarning("予約状態の保存に失敗しました: " + safeError(exception)); } }
    private String createStateDocument() {
        StringBuilder body = new StringBuilder(4096);
        body.append("{\"schemaVersion\":").append(SCHEMA_VERSION) .append(",\"settings\":");
        appendMap(body, settings);
        body.append(",\"schedules\":");
        appendList(body, schedules);
        body.append(",\"history\":");
        appendList(body, history);
        return body.append('}').toString(); }
    private String createStateJson() {
        synchronized (stateLock) {
            StringBuilder body = new StringBuilder(createStateDocument());
            body.setLength(body.length() - 1);
            body.append(",\"credentials\":{\"stored\":") .append(!encryptedCookie.isEmpty()) .append(",\"savedAt\":").append(credentialsSavedAt) .append("},\"activeScheduleId\":\"")
                    .append(TextUtil.escapeJSON(activeScheduleId)) .append("\"}");
            return body.toString(); } }
    private void atomicWrite(Path target, String content, boolean secret) throws IOException {
        Files.createDirectories(target.getParent());
        Path temporary = target.resolveSibling(target.getFileName() + ".tmp");
        Files.writeString(temporary, content, StandardCharsets.UTF_8);
        if (secret) restrictPermissions(temporary);
        try {
            Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING); }
        if (secret) restrictPermissions(target); }
    private void restrictPermissions(Path file) {
        try {
            Files.setPosixFilePermissions(file, EnumSet.of( PosixFilePermission.OWNER_READ, PosixFilePermission.OWNER_WRITE));
            return;
        } catch (UnsupportedOperationException | IOException ignored) {
            // WindowsではACLを使う。
        }
        try {
            AclFileAttributeView view = Files.getFileAttributeView( file, AclFileAttributeView.class);
            if (view == null) return;
            UserPrincipal owner = Files.getOwner(file);
            Set<AclEntryPermission> permissions = EnumSet.allOf( AclEntryPermission.class);
            AclEntry entry = AclEntry.newBuilder().setType(AclEntryType.ALLOW) .setPrincipal(owner).setPermissions(permissions).build();
            view.setAcl(List.of(entry));
        } catch (IOException | UnsupportedOperationException exception) {
            logWarning("認証情報ファイルの所有者限定ACLを設定できませんでした"); } }
    private void backupBroken(Path file) {
        try {
            if (Files.exists(file)) {
                Files.move(file, file.resolveSibling(file.getFileName() + ".corrupt-" + System.currentTimeMillis()), StandardCopyOption.REPLACE_EXISTING); }
        } catch (IOException exception) {
            logWarning("破損ファイルの退避に失敗しました"); } }
    private JsonObject readJsonObject(HttpRequestHeader request, Socket browser) throws IOException {
        long length = request.getContentLength();
        if (length <= 0L || length > MAX_BODY) return null;
        byte[] bytes = new byte[(int) length];
        InputStream input = browser.getInputStream();
        int offset = 0;
        while (offset < bytes.length) {
            int read = input.read(bytes, offset, bytes.length - offset);
            if (read < 0) throw new IOException("request body ended unexpectedly");
            offset += read; }
        try {
            return Json.parseObject(new String(bytes, StandardCharsets.UTF_8));
        } catch (RuntimeException exception) {
            return null; } }
    private Map<String, Object> jsonToMap(JsonObject object) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (Map.Entry<String, JsonValue> entry : object.getMap().entrySet()) {
            JsonValue value = entry.getValue();
            if (value instanceof JsonNumber) {
                result.put(entry.getKey(), ((JsonNumber) value).getLong());
            } else if (value instanceof dareka.common.json.JsonString) {
                result.put(entry.getKey(), value.getString());
            } else if (value instanceof dareka.common.json.JsonBoolean) {
                result.put(entry.getKey(), value.toBoolean()); } }
        return result; }
    private void appendList(StringBuilder body, List<Map<String, Object>> values) {
        body.append('[');
        boolean comma = false;
        for (Map<String, Object> value : values) {
            if (comma) body.append(',');
            comma = true;
            appendMap(body, value); }
        body.append(']'); }
    private void appendMap(StringBuilder body, Map<String, Object> value) {
        body.append('{');
        boolean comma = false;
        for (Map.Entry<String, Object> entry : value.entrySet()) {
            Object item = entry.getValue();
            if (!(item instanceof String || item instanceof Number || item instanceof Boolean)) continue;
            if (comma) body.append(',');
            comma = true;
            body.append('"').append(TextUtil.escapeJSON(entry.getKey())) .append("\":");
            if (item instanceof Number || item instanceof Boolean) {
                body.append(item);
            } else {
                body.append('"').append(TextUtil.escapeJSON((String) item)) .append('"'); } }
        body.append('}'); }
    private Map<String, Object> requireSchedule(String id) {
        Map<String, Object> schedule = findSchedule(id);
        if (schedule == null) throw new IllegalArgumentException("予約が見つかりません");
        return schedule; }
    private Map<String, Object> findSchedule(String id) {
        if (id == null || id.isEmpty()) return null;
        for (Map<String, Object> schedule : schedules) {
            if (id.equals(text(schedule, "id"))) return schedule; }
        return null; }
    private String textFromSchedule(String id, String key) {
        synchronized (stateLock) {
            Map<String, Object> schedule = findSchedule(id);
            return schedule == null ? "" : text(schedule, key); } }
    private String text(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof String ? (String) value : ""; }
    private long number(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof Number ? ((Number) value).longValue() : 0L; }
    private boolean bool(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof Boolean && (Boolean) value; }
    private long longSetting(String key) {
        return number(settings, key); }
    private String stringValue(JsonObject object, String key) {
        JsonValue value = object.get(key);
        return value == null || value.isNull() ? null : value.getString(); }
    private String requiredString(JsonObject object, String key, int maximum) {
        String value = stringValue(object, key);
        if (value == null || value.trim().isEmpty() || value.length() > maximum) {
            throw new IllegalArgumentException(key + "が不正です"); }
        return value.trim(); }
    private String optionalString(JsonObject object, String key, int maximum) {
        String value = stringValue(object, key);
        if (value == null) return "";
        value = value.trim();
        if (value.length() > maximum) throw new IllegalArgumentException(key + "が長すぎます");
        return value; }
    private String requiredChoice(JsonObject object, String key, String... choices) {
        String value = requiredString(object, key, 32);
        for (String choice : choices) if (choice.equals(value)) return value;
        throw new IllegalArgumentException(key + "が不正です"); }
    private long longValue(JsonObject object, String key, long fallback) {
        JsonValue value = object.get(key);
        return value instanceof JsonNumber ? ((JsonNumber) value).getLong() : fallback; }
    private long jsonLong(JsonObject object, String key, long fallback) {
        return object == null ? fallback : longValue(object, key, fallback); }
    private boolean booleanValue(JsonObject object, String key, boolean fallback) {
        JsonValue value = object.get(key);
        return value == null || value.isNull() ? fallback : value.toBoolean(); }
    private long range(long value, long minimum, long maximum, String label) {
        if (value < minimum || value > maximum) {
            throw new IllegalArgumentException(label + "が範囲外です"); }
        return value; }
    private void putIfString(JsonObject object, String key) {
        String value = stringValue(object, key);
        if (value != null) settings.put(key, value); }
    private void putIfNumber(JsonObject object, String key) {
        JsonValue value = object.get(key);
        if (value instanceof JsonNumber) {
            settings.put(key, ((JsonNumber) value).getLong()); } }
    private String safeError(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isEmpty()) {
            return exception.getClass().getSimpleName(); }
        message = message.replaceAll("https?://\\S+", "[URL省略]") .replace('\r', ' ').replace('\n', ' ').trim();
        return message.length() > 200 ? message.substring(0, 200) : message; }
    private Resource json(String body) {
        StringResource response = new StringResource(body);
        response.addResponseHeader(HttpHeader.CONTENT_TYPE, "application/json; charset=utf-8");
        response.addResponseHeader("X-Content-Type-Options", "nosniff");
        response.addNoCacheResponseHeaders();
        return response; }
    private void logInfo(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) logger.info(message);
        else Logger.info("smartFetcher: " + message); }
    private void logWarning(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) logger.warning(message);
        else Logger.warning("smartFetcher: " + message); } }
