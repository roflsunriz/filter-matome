package extensions;

import java.awt.Color;
import java.awt.Desktop;
import java.awt.EventQueue;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.Image;
import java.awt.SystemTray;
import java.awt.Toolkit;
import java.awt.TrayIcon;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.Socket;
import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.NLMain;
import dareka.common.LoggerHandler;
import dareka.common.TextUtil;
import dareka.common.json.Json;
import dareka.common.json.JsonArray;
import dareka.common.json.JsonNumber;
import dareka.common.json.JsonObject;
import dareka.common.json.JsonValue;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.extensions.SystemEventListener;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;

/**
 * watch-historyのシリーズアラートをNicoCache_nl側で定期確認し、
 * ページを閉じていてもOS通知を表示する。
 */
public final class FilterMatomeSeriesAlerts
        implements Extension2, Processor, SystemEventListener {

    public static final int REVISION = 26081801;
    public static final String VER_STRING = "FilterMatomeSeriesAlerts_" + REVISION;

    private static final String LOG_PREFIX = "SeriesAlerts";
    private static final String TAB_TITLE = "Series Alerts";
    private static final String REQUEST_HEADER = "X-Filter-Matome-Series-Alerts";
    private static final String[] SUPPORTED_METHODS = { "GET", "POST" };
    private static final Pattern SUPPORTED_URL = Pattern.compile(
            "^https?://nicocachenl\\.test/api/v1/extensions/filter-matome/series-alerts/"
                    + "(status|config|check-now|test-notification)$");
    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile(
            "^[a-z]{2}\\d+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ALERT_ID_PATTERN = Pattern.compile(
            "^[A-Za-z0-9_:-]{1,200}$");
    private static final Pattern META_TAG_PATTERN = Pattern.compile(
            "<meta\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern META_ATTRIBUTE_PATTERN = Pattern.compile(
            "([A-Za-z_:][A-Za-z0-9_.:-]*)\\s*=\\s*"
                    + "(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))",
            Pattern.CASE_INSENSITIVE);

    private static final Path STATE_FILE = Path.of(
            "data", "filter-matome-series-alerts.json");
    private static final int SCHEMA_VERSION = 1;
    private static final int MAX_ALERTS = 200;
    private static final int MAX_REQUEST_BYTES = 512 * 1024;
    private static final int MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
    private static final long MIN_INTERVAL_MS = 60_000L;
    private static final long MAX_INTERVAL_MS = 90L * 24 * 60 * 60 * 1000;
    private static final long ERROR_RETRY_MS = 15L * 60 * 1000;
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int READ_TIMEOUT_MS = 15_000;

    private final Object stateLock = new Object();
    private final Map<String, Map<String, Object>> alerts =
            new LinkedHashMap<>();
    private final AtomicBoolean checking = new AtomicBoolean(false);
    private final ExecutorService executor = Executors.newSingleThreadExecutor(
            runnable -> {
                Thread thread = new Thread(runnable,
                        "FilterMatomeSeriesAlerts");
                thread.setDaemon(true);
                thread.setPriority(Thread.MIN_PRIORITY);
                return thread;
            });

    private volatile long lastRunAt;
    private volatile String lastError = "";
    private volatile TrayIcon trayIcon;
    private volatile String notificationTarget =
            "https://www.nicovideo.jp/local/features/dist/pages/watch-history/index.html";
    private volatile LoggerHandler extensionLogger;
    private boolean stateLoaded;

    @Override
    public void registerExtensions(ExtensionManager manager) {
        manager.registerProcessor(this);
        manager.registerEventListener(this);
        if (extensionLogger == null) {
            extensionLogger = NLMain.getExtLogger(
                    this, TAB_TITLE, null, true);
        }
        if (!stateLoaded) {
            stateLoaded = true;
            loadState();
        }
    }

    @Override
    public String getVersionString() {
        return VER_STRING;
    }

    @Override
    public String[] getSupportedMethods() {
        return SUPPORTED_METHODS;
    }

    @Override
    public Pattern getSupportedURLAsPattern() {
        return SUPPORTED_URL;
    }

    @Override
    public String getSupportedURLAsString() {
        return null;
    }

    @Override
    public Resource onRequest(HttpRequestHeader requestHeader, Socket browser)
            throws IOException {
        java.util.regex.Matcher matcher = SUPPORTED_URL.matcher(
                requestHeader.getURI());
        if (!matcher.matches()
                || !"1".equals(requestHeader.getMessageHeader(REQUEST_HEADER))) {
            return StringResource.getNotFound();
        }

        String action = matcher.group(1);
        String method = requestHeader.getMethod();
        try {
            if ("status".equals(action) && "GET".equals(method)) {
                return createJsonResource(createStatusJson());
            }
            if ("config".equals(action) && "POST".equals(method)) {
                if (requestHeader.getContentLength() > MAX_REQUEST_BYTES) {
                    return StringResource.getPayloadTooLarge();
                }
                replaceConfig(readRequestBody(requestHeader, browser));
                return createJsonResource(createStatusJson());
            }
            if ("check-now".equals(action) && "POST".equals(method)) {
                boolean accepted = scheduleCheck(true);
                return createJsonResource("{\"accepted\":" + accepted + "}");
            }
            if ("test-notification".equals(action) && "POST".equals(method)) {
                boolean displayed = displayNotification(
                        "filter-matome シリーズアラート",
                        "常駐通知は正常に動作しています。",
                        notificationTarget);
                return createJsonResource("{\"displayed\":" + displayed + "}");
            }
            return StringResource.getMethodNotAllowed();
        } catch (IllegalArgumentException exception) {
            appendLog("設定要求を拒否しました: " + exception.getMessage());
            return StringResource.getBadRequest();
        } catch (Exception exception) {
            appendWarning("request failed: " + exception.getMessage());
            return StringResource.getInternalError("series alert request failed");
        }
    }

    @Override
    public int onSystemEvent(int id, EventSource source) {
        if (id == PERIODIC_CALL) {
            scheduleCheck(false);
        } else if (id == SYSTEM_EXIT) {
            executor.shutdownNow();
            removeTrayIcon();
        }
        return RESULT_OK;
    }

    private boolean scheduleCheck(boolean force) {
        if (!checking.compareAndSet(false, true)) {
            return false;
        }
        executor.execute(() -> {
            try {
                checkAlerts(force);
            } finally {
                checking.set(false);
            }
        });
        return true;
    }

    private void checkAlerts(boolean force) {
        long now = System.currentTimeMillis();
        List<Map<String, Object>> targets = new ArrayList<>();
        synchronized (stateLock) {
            for (Map<String, Object> alert : alerts.values()) {
                if (alertBoolean(alert, "enabled")
                        && (force || alertLong(alert, "nextCheckAt") <= now)) {
                    targets.add(copyAlert(alert));
                }
            }
        }

        int notifications = 0;
        String runError = "";
        for (Map<String, Object> snapshot : targets) {
            try {
                String snapshotVideoId = alertString(snapshot, "lastVideoId");
                String[] next = fetchNextSeriesVideo(snapshotVideoId);
                long checkedAt = System.currentTimeMillis();
                Map<String, Object> updated;
                synchronized (stateLock) {
                    Map<String, Object> current = alerts.get(
                            alertString(snapshot, "id"));
                    if (current == null
                            || !alertString(current, "lastVideoId").equals(
                                    snapshotVideoId)) {
                        continue;
                    }
                    current.put("lastCheckedAt", checkedAt);
                    current.put("nextCheckAt", checkedAt
                            + alertLong(current, "checkInterval"));
                    current.put("updatedAt", checkedAt);
                    if (next != null
                            && !next[0].equalsIgnoreCase(
                                    alertString(current, "lastVideoId"))) {
                        current.put("lastVideoId", next[0]);
                        current.put("lastVideoTitle", next[1]);
                    }
                    updated = copyAlert(current);
                }

                if (next != null
                        && !next[0].equalsIgnoreCase(snapshotVideoId)) {
                    notifications++;
                    displayNotification(alertString(updated, "seriesTitle"),
                            "新着「" + next[1] + "」が投稿されました。",
                            "https://www.nicovideo.jp/watch/" + next[0]);
                }
            } catch (Exception exception) {
                long failedAt = System.currentTimeMillis();
                synchronized (stateLock) {
                    Map<String, Object> current = alerts.get(
                            alertString(snapshot, "id"));
                    if (current != null) {
                        current.put("nextCheckAt", failedAt + Math.min(
                                alertLong(current, "checkInterval"),
                                ERROR_RETRY_MS));
                        current.put("updatedAt", failedAt);
                    }
                }
                runError = alertString(snapshot, "seriesTitle") + ": "
                        + exception.getMessage();
                appendLog("確認失敗: " + runError);
            }
        }

        lastRunAt = System.currentTimeMillis();
        lastError = runError;
        if (!targets.isEmpty()) {
            saveState();
            appendLog(targets.size() + "件を確認し、" + notifications
                    + "件の新着を通知しました。");
        }
    }

    private String[] fetchNextSeriesVideo(String videoId) throws IOException {
        if (!VIDEO_ID_PATTERN.matcher(videoId).matches()) {
            throw new IOException("動画IDが不正です");
        }

        URL url = new URL("https://www.nicovideo.jp/watch/"
                + videoId.toLowerCase(Locale.ROOT));
        HttpURLConnection connection = (HttpURLConnection) url.openConnection(
                Proxy.NO_PROXY);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Accept", "text/html");
        connection.setRequestProperty("Accept-Encoding", "identity");
        connection.setRequestProperty("User-Agent",
                "filter-matome-series-alerts/1.0");

        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("watch page returned HTTP " + status);
            }
            String html;
            try (InputStream input = connection.getInputStream()) {
                html = new String(readLimited(input), StandardCharsets.UTF_8);
            }
            String content = extractServerResponseContent(html);
            if (content == null || content.isBlank()) {
                throw new IOException("server-responseが見つかりません");
            }
            String normalized = content.trim();
            if (!normalized.startsWith("{")) {
                normalized = URLDecoder.decode(normalized,
                        StandardCharsets.UTF_8);
            }
            JsonValue root = Json.parse(normalized);
            if (root == null) {
                throw new IOException("server-responseを解析できません");
            }
            String id = Json.getString(root, "data", "response", "series",
                    "video", "next", "id");
            String title = Json.getString(root, "data", "response", "series",
                    "video", "next", "title");
            if (id == null || title == null) {
                return null;
            }
            if (!VIDEO_ID_PATTERN.matcher(id).matches()) {
                throw new IOException("次動画IDが不正です");
            }
            return new String[] { id.toLowerCase(Locale.ROOT),
                    limitString(title, 500) };
        } finally {
            connection.disconnect();
        }
    }

    private String extractServerResponseContent(String html) {
        Matcher tags = META_TAG_PATTERN.matcher(html);
        while (tags.find()) {
            String name = null;
            String content = null;
            Matcher attributes = META_ATTRIBUTE_PATTERN.matcher(tags.group());
            while (attributes.find()) {
                String key = attributes.group(1);
                String value = firstNonNull(attributes.group(2),
                        attributes.group(3), attributes.group(4));
                if ("name".equalsIgnoreCase(key)) {
                    name = TextUtil.unescapeHTML(value);
                } else if ("content".equalsIgnoreCase(key)) {
                    content = TextUtil.unescapeHTML(value);
                }
            }
            if ("server-response".equals(name) && content != null) {
                return content;
            }
        }
        return null;
    }

    private void replaceConfig(String body) {
        JsonObject root = Json.parseObject(body);
        if (root == null || getLong(root, "schemaVersion") != SCHEMA_VERSION) {
            throw new IllegalArgumentException("未対応の設定形式です");
        }
        JsonArray inputAlerts = root.getArray("alerts");
        if (inputAlerts == null || inputAlerts.size() > MAX_ALERTS) {
            throw new IllegalArgumentException("アラート件数が不正です");
        }

        Map<String, Map<String, Object>> incoming = new LinkedHashMap<>();
        for (int index = 0; index < inputAlerts.size(); index++) {
            Map<String, Object> alert = parseAlert(
                    inputAlerts.get(index).getObject());
            if (incoming.put(alertString(alert, "id"), alert) != null) {
                throw new IllegalArgumentException("アラートIDが重複しています");
            }
        }

        synchronized (stateLock) {
            for (Map.Entry<String, Map<String, Object>> entry
                    : incoming.entrySet()) {
                Map<String, Object> current = alerts.get(entry.getKey());
                Map<String, Object> candidate = entry.getValue();
                if (current != null
                        && alertLong(current, "updatedAt")
                                > alertLong(candidate, "updatedAt")) {
                    entry.setValue(current);
                }
            }
            alerts.clear();
            alerts.putAll(incoming);
        }
        saveState();
        appendLog(alerts.size() + "件のアラート設定を同期しました。");
    }

    private Map<String, Object> parseAlert(JsonObject object) {
        if (object == null) {
            throw new IllegalArgumentException("アラートがオブジェクトではありません");
        }
        Map<String, Object> alert = new LinkedHashMap<>();
        alert.put("id", requireString(object, "id", 200));
        alert.put("seriesId", getLong(object, "seriesId"));
        alert.put("seriesTitle", requireString(object, "seriesTitle", 500));
        alert.put("lastVideoId", requireString(object, "lastVideoId", 32)
                .toLowerCase(Locale.ROOT));
        alert.put("lastVideoTitle",
                requireString(object, "lastVideoTitle", 500));
        alert.put("lastCheckedAt", getLong(object, "lastCheckedAt"));
        alert.put("nextCheckAt", getLong(object, "nextCheckAt"));
        alert.put("checkInterval", getLong(object, "checkInterval"));
        alert.put("enabled", getBoolean(object, "enabled"));
        alert.put("createdAt", getLong(object, "createdAt"));
        alert.put("updatedAt", getLong(object, "updatedAt"));

        if (!ALERT_ID_PATTERN.matcher(alertString(alert, "id")).matches()
                || alertLong(alert, "seriesId") <= 0
                || !VIDEO_ID_PATTERN.matcher(
                        alertString(alert, "lastVideoId")).matches()
                || alertLong(alert, "checkInterval") < MIN_INTERVAL_MS
                || alertLong(alert, "checkInterval") > MAX_INTERVAL_MS
                || alertLong(alert, "lastCheckedAt") < 0
                || alertLong(alert, "nextCheckAt") < 0
                || alertLong(alert, "createdAt") <= 0
                || alertLong(alert, "updatedAt") <= 0) {
            throw new IllegalArgumentException("アラート値が不正です");
        }
        return alert;
    }

    private String createStatusJson() {
        StringBuilder json = new StringBuilder(1024);
        json.append("{\"schemaVersion\":").append(SCHEMA_VERSION)
                .append(",\"notificationAvailable\":")
                .append(isSystemNotificationSupported())
                .append(",\"checking\":").append(checking.get())
                .append(",\"lastRunAt\":").append(lastRunAt)
                .append(",\"lastError\":\"")
                .append(TextUtil.escapeJSON(lastError)).append("\",\"alerts\":[");
        synchronized (stateLock) {
            boolean comma = false;
            for (Map<String, Object> alert : alerts.values()) {
                if (comma) {
                    json.append(',');
                }
                comma = true;
                appendAlertJson(json, alert);
            }
        }
        return json.append("]}").toString();
    }

    private void loadState() {
        if (!Files.isRegularFile(STATE_FILE)) {
            return;
        }
        try {
            String json = Files.readString(STATE_FILE, StandardCharsets.UTF_8);
            JsonObject root = Json.parseObject(json);
            if (root == null || getLong(root, "schemaVersion") != SCHEMA_VERSION) {
                throw new IllegalArgumentException("未対応の保存形式です");
            }
            JsonArray savedAlerts = root.getArray("alerts");
            if (savedAlerts == null || savedAlerts.size() > MAX_ALERTS) {
                throw new IllegalArgumentException("保存アラート件数が不正です");
            }
            synchronized (stateLock) {
                alerts.clear();
                for (int index = 0; index < savedAlerts.size(); index++) {
                    Map<String, Object> alert = parseAlert(
                            savedAlerts.get(index).getObject());
                    alerts.put(alertString(alert, "id"), alert);
                }
            }
            appendLog(alerts.size() + "件の保存済みアラートを読み込みました。");
        } catch (Exception exception) {
            backupBrokenState();
            appendWarning("invalid state file: " + exception.getMessage());
        }
    }

    private void saveState() {
        String json;
        synchronized (stateLock) {
            StringBuilder builder = new StringBuilder(1024);
            builder.append("{\"schemaVersion\":").append(SCHEMA_VERSION)
                    .append(",\"alerts\":[");
            boolean comma = false;
            for (Map<String, Object> alert : alerts.values()) {
                if (comma) {
                    builder.append(',');
                }
                comma = true;
                appendAlertJson(builder, alert);
            }
            json = builder.append("]}").toString();
        }

        try {
            Files.createDirectories(STATE_FILE.getParent());
            Path temporary = STATE_FILE.resolveSibling(
                    STATE_FILE.getFileName() + ".tmp");
            Files.writeString(temporary, json, StandardCharsets.UTF_8);
            try {
                Files.move(temporary, STATE_FILE,
                        StandardCopyOption.REPLACE_EXISTING,
                        StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException exception) {
                Files.move(temporary, STATE_FILE,
                        StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            lastError = "設定保存失敗: " + exception.getMessage();
            appendWarning(lastError);
        }
    }

    private void backupBrokenState() {
        try {
            if (Files.exists(STATE_FILE)) {
                Path backup = STATE_FILE.resolveSibling(
                        STATE_FILE.getFileName() + ".corrupt-"
                                + System.currentTimeMillis());
                Files.move(STATE_FILE, backup,
                        StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            appendWarning("failed to back up state: "
                    + exception.getMessage());
        }
    }

    private void appendAlertJson(StringBuilder json,
            Map<String, Object> alert) {
        json.append('{');
        appendString(json, "id", alertString(alert, "id"), false);
        appendNumber(json, "seriesId", alertLong(alert, "seriesId"));
        appendString(json, "seriesTitle",
                alertString(alert, "seriesTitle"), true);
        appendString(json, "lastVideoId",
                alertString(alert, "lastVideoId"), true);
        appendString(json, "lastVideoTitle",
                alertString(alert, "lastVideoTitle"), true);
        appendNumber(json, "lastCheckedAt",
                alertLong(alert, "lastCheckedAt"));
        appendNumber(json, "nextCheckAt", alertLong(alert, "nextCheckAt"));
        appendNumber(json, "checkInterval",
                alertLong(alert, "checkInterval"));
        json.append(",\"enabled\":").append(alertBoolean(alert, "enabled"));
        appendNumber(json, "createdAt", alertLong(alert, "createdAt"));
        appendNumber(json, "updatedAt", alertLong(alert, "updatedAt"));
        json.append('}');
    }

    private void appendString(StringBuilder json, String key, String value,
            boolean comma) {
        if (comma) {
            json.append(',');
        }
        json.append('"').append(key).append("\":\"")
                .append(TextUtil.escapeJSON(value)).append('"');
    }

    private void appendNumber(StringBuilder json, String key, long value) {
        json.append(",\"").append(key).append("\":").append(value);
    }

    private String readRequestBody(HttpRequestHeader requestHeader,
            Socket browser) throws IOException {
        long contentLength = requestHeader.getContentLength();
        if (contentLength <= 0) {
            throw new IllegalArgumentException("要求本文がありません");
        }
        byte[] body = new byte[(int) contentLength];
        InputStream input = browser.getInputStream();
        int offset = 0;
        while (offset < body.length) {
            int read = input.read(body, offset, body.length - offset);
            if (read < 0) {
                throw new IOException("要求本文が途中で終了しました");
            }
            offset += read;
        }
        return new String(body, StandardCharsets.UTF_8);
    }

    private byte[] readLimited(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16 * 1024];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) >= 0) {
            total += read;
            if (total > MAX_RESPONSE_BYTES) {
                throw new IOException("watch page response exceeded size limit");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private Resource createJsonResource(String json) {
        StringResource response = new StringResource(json);
        response.addResponseHeader(HttpHeader.CONTENT_TYPE,
                "application/json; charset=utf-8");
        response.addResponseHeader("X-Content-Type-Options", "nosniff");
        response.addNoCacheResponseHeaders();
        return response;
    }

    private boolean displayNotification(String title, String message,
            String targetUrl) {
        notificationTarget = targetUrl;
        appendLog("通知: " + title + " - " + message + " (" + targetUrl + ")");
        if (!ensureTrayIcon()) {
            try {
                Toolkit.getDefaultToolkit().beep();
            } catch (RuntimeException ignored) {
                // GUIログは必ず残す。
            }
            return false;
        }
        trayIcon.displayMessage(limitString(title, 120),
                limitString(message, 240), TrayIcon.MessageType.INFO);
        return true;
    }

    private boolean ensureTrayIcon() {
        if (trayIcon != null) {
            return true;
        }
        if (!isSystemNotificationSupported()) {
            return false;
        }
        try {
            EventQueue.invokeAndWait(() -> {
                if (trayIcon != null) {
                    return;
                }
                try {
                    TrayIcon icon = new TrayIcon(createTrayImage(),
                            "filter-matome シリーズアラート");
                    icon.setImageAutoSize(true);
                    icon.addActionListener(event -> openNotificationTarget());
                    SystemTray.getSystemTray().add(icon);
                    trayIcon = icon;
                } catch (Exception exception) {
                    appendWarning("tray initialization failed: "
                            + exception.getMessage());
                }
            });
        } catch (Exception exception) {
            appendWarning("tray initialization failed: "
                    + exception.getMessage());
        }
        return trayIcon != null;
    }

    private boolean isSystemNotificationSupported() {
        return !GraphicsEnvironment.isHeadless() && SystemTray.isSupported();
    }

    private Image createTrayImage() {
        BufferedImage image = new BufferedImage(16, 16,
                BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(new Color(43, 108, 176));
            graphics.fillOval(0, 0, 15, 15);
            graphics.setColor(Color.WHITE);
            graphics.fillArc(4, 3, 8, 8, 0, 180);
            graphics.fillRect(4, 7, 8, 4);
            graphics.fillOval(7, 12, 2, 2);
        } finally {
            graphics.dispose();
        }
        return image;
    }

    private void openNotificationTarget() {
        String target = notificationTarget;
        try {
            if (Desktop.isDesktopSupported()
                    && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(target));
            } else {
                appendLog("ブラウザーを自動で開けません: " + target);
            }
        } catch (Exception exception) {
            appendLog("通知先を開けません: " + exception.getMessage());
        }
    }

    private void removeTrayIcon() {
        TrayIcon icon = trayIcon;
        if (icon != null && SystemTray.isSupported()) {
            SystemTray.getSystemTray().remove(icon);
            trayIcon = null;
        }
    }

    private void appendLog(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.info(message);
        }
    }

    private void appendWarning(String message) {
        LoggerHandler logger = extensionLogger;
        if (logger != null) {
            logger.warning(message);
        }
    }

    private long getLong(JsonObject object, String key) {
        JsonValue value = object.get(key);
        if (!(value instanceof JsonNumber)) {
            throw new IllegalArgumentException(key + "が数値ではありません");
        }
        return ((JsonNumber) value).getLong();
    }

    private boolean getBoolean(JsonObject object, String key) {
        JsonValue value = object.get(key);
        if (value == null || value.isNull()
                || !("true".equals(value.toJson())
                        || "false".equals(value.toJson()))) {
            throw new IllegalArgumentException(key + "が真偽値ではありません");
        }
        return value.toBoolean();
    }

    private String requireString(JsonObject object, String key, int maxLength) {
        String value = object.getString(key);
        if (value == null || value.isBlank() || value.length() > maxLength) {
            throw new IllegalArgumentException(key + "が不正です");
        }
        return value;
    }

    private String limitString(String value, int maxLength) {
        return value.length() <= maxLength
                ? value : value.substring(0, maxLength);
    }

    private Map<String, Object> copyAlert(Map<String, Object> alert) {
        return new LinkedHashMap<>(alert);
    }

    private String alertString(Map<String, Object> alert, String key) {
        return (String) alert.get(key);
    }

    private long alertLong(Map<String, Object> alert, String key) {
        return ((Long) alert.get(key)).longValue();
    }

    private boolean alertBoolean(Map<String, Object> alert, String key) {
        return ((Boolean) alert.get(key)).booleanValue();
    }

    private String firstNonNull(String... values) {
        for (String value : values) {
            if (value != null) {
                return value;
            }
        }
        return "";
    }
}
