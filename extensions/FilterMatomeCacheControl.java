package extensions;

import java.io.IOException;
import java.io.InputStream;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.common.Logger;
import dareka.common.TextUtil;
import dareka.common.json.Json;
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
import dareka.processor.impl.Cache;
import dareka.processor.impl.VideoDescriptor;

/**
 * filter-matome向けのHLSキャッシュ削除API。
 *
 * <p>NicoCache_nl本体の公開APIだけを利用し、MP4・FLV・SWFには触れない。
 * ダウンロード中のHLSは即時削除せず、完了・中断後の削除予約として扱う。</p>
 */
public final class FilterMatomeCacheControl
        implements Extension2, Processor, SystemEventListener {

    public static final int REVISION = 260713;
    public static final String VER_STRING =
            "FilterMatomeCacheControl_" + REVISION;

    private static final String API_PREFIX = "/cache/filter-matome/v1/";
    private static final String REQUEST_HEADER =
            "X-Filter-Matome-Cache-Control";
    private static final String[] SUPPORTED_METHODS = { "GET", "POST" };
    private static final Pattern SUPPORTED_URL = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp" + API_PREFIX
                    + "(capabilities|remove|remove-status)(?:\\?([^#]*))?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern VIDEO_ID_PATTERN = Pattern.compile(
            "^[a-z]{2}[0-9]+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern REQUEST_ID_PATTERN = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
            Pattern.CASE_INSENSITIVE);

    private static final int MAX_REQUEST_BODY_BYTES = 8 * 1024;
    private static final long COMPLETED_REQUEST_TTL_MS = 60L * 60L * 1000L;
    private static final long PENDING_REQUEST_TTL_MS = 24L * 60L * 60L * 1000L;

    /** requestId -> (cacheId -> outcome) */
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, String>>
            requestOutcomes = new ConcurrentHashMap<>();
    /** requestId -> videoId */
    private final ConcurrentHashMap<String, String> requestVideoIds =
            new ConcurrentHashMap<>();
    /** requestId -> 最終更新時刻 */
    private final ConcurrentHashMap<String, Long> requestUpdatedAt =
            new ConcurrentHashMap<>();
    /** videoId -> queuedを含むrequestId */
    private final ConcurrentHashMap<String, Set<String>> pendingRequestsByVideo =
            new ConcurrentHashMap<>();

    @Override
    public void registerExtensions(ExtensionManager manager) {
        manager.registerProcessor(this);
        manager.registerEventListener(this);
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
        Matcher matcher = SUPPORTED_URL.matcher(requestHeader.getURI());
        if (!matcher.matches()) {
            return StringResource.getNotFound();
        }
        if (!"1".equals(requestHeader.getMessageHeader(REQUEST_HEADER))) {
            return StringResource.getNotFound();
        }

        String operation = matcher.group(1).toLowerCase(Locale.ROOT);
        String query = matcher.group(2);
        switch (operation) {
        case "capabilities":
            if (!requestHeader.isGetMethod()) {
                return StringResource.getMethodNotAllowed();
            }
            return createCapabilitiesResponse();
        case "remove":
            if (!"POST".equalsIgnoreCase(requestHeader.getMethod())) {
                return StringResource.getMethodNotAllowed();
            }
            return processRemoveRequest(requestHeader, browser);
        case "remove-status":
            if (!requestHeader.isGetMethod()) {
                return StringResource.getMethodNotAllowed();
            }
            return processStatusRequest(query);
        default:
            return StringResource.getNotFound();
        }
    }

    private Resource createCapabilitiesResponse() {
        StringBuilder json = new StringBuilder(384);
        json.append('{');
        appendJsonStringField(json, "apiVersion", "1", false);
        appendJsonStringField(json, "extensionVersion", VER_STRING, true);
        json.append(",\"removeTarget\":\"hls\"");
        json.append(",\"preservesNonHls\":true");
        json.append(",\"activeDownload\":\"queue\"");
        json.append(",\"immediateCancellation\":false");
        json.append(",\"operations\":[\"remove\",\"remove-status\"]");
        json.append('}');
        return createJsonResource(json.toString());
    }

    private Resource processRemoveRequest(
            HttpRequestHeader requestHeader, Socket browser) throws IOException {
        long contentLength = requestHeader.getContentLength();
        if (contentLength <= 0) {
            return StringResource.getBadRequest();
        }
        if (contentLength > MAX_REQUEST_BODY_BYTES) {
            return StringResource.getPayloadTooLarge();
        }

        String requestBody = readRequestBody(browser, (int) contentLength);
        String videoId;
        try {
            JsonValue parsed = Json.parse(requestBody);
            JsonObject object = parsed.getObject();
            if (object == null) {
                return StringResource.getBadRequest();
            }
            videoId = getRequiredString(object, "videoId");
            String scope = getOptionalString(object, "scope", "hls");
            String activeDownload = getOptionalString(
                    object, "activeDownload", "queue");
            if (!"hls".equals(scope) || !"queue".equals(activeDownload)) {
                return StringResource.getBadRequest();
            }
        } catch (RuntimeException exception) {
            Logger.warning("FilterMatomeCacheControl: invalid request body");
            return StringResource.getBadRequest();
        }

        videoId = videoId.toLowerCase(Locale.ROOT);
        if (!VIDEO_ID_PATTERN.matcher(videoId).matches()) {
            return StringResource.getBadRequest();
        }

        String requestId = UUID.randomUUID().toString();
        ConcurrentHashMap<String, String> outcomes = new ConcurrentHashMap<>();
        requestOutcomes.put(requestId, outcomes);
        requestVideoIds.put(requestId, videoId);
        requestUpdatedAt.put(requestId, System.currentTimeMillis());

        List<VideoDescriptor> videos =
                new ArrayList<>(Cache.getVideos(videoId));
        for (VideoDescriptor video : videos) {
            if (!isHls(video)) {
                continue;
            }
            Cache cache = new Cache(video);
            boolean complete = cache.exists();
            boolean downloading = Cache.getDLFlag(video);
            boolean hasTemporary = cache.tmpCachedSize() >= 0;
            if (!complete && !downloading && !hasTemporary) {
                continue;
            }

            String cacheId = cache.getId();
            if (downloading) {
                outcomes.put(cacheId, "queued");
                continue;
            }
            outcomes.put(cacheId, removeSettledCache(video, cache));
        }

        updatePendingRegistration(requestId);
        Logger.info("FilterMatomeCacheControl: HLS removal requested for "
                + videoId + " (" + requestId + ")");
        return createRequestResponse(requestId);
    }

    private Resource processStatusRequest(String query) {
        String requestId = getQueryParameter(query, "id");
        if (requestId == null
                || !REQUEST_ID_PATTERN.matcher(requestId).matches()
                || !requestOutcomes.containsKey(requestId)) {
            return StringResource.getNotFound();
        }
        return createRequestResponse(requestId);
    }

    private String removeSettledCache(VideoDescriptor video, Cache cache) {
        try {
            if (Cache.getDLFlag(video)) {
                return "queued";
            }
            if (cache.exists()) {
                if (Cache.remove(video)) {
                    return "deleted";
                }
                return cache.exists() ? "failed" : "not_found";
            }
            if (cache.tmpCachedSize() >= 0) {
                // deleteTmp()はHLSのセグメント管理情報も忘却する。
                if (cache.deleteTmp()) {
                    return "deleted";
                }
                return Cache.getDLFlag(video) ? "queued" : "not_found";
            }
            return "not_found";
        } catch (IOException | RuntimeException exception) {
            Logger.warning("FilterMatomeCacheControl: failed to remove "
                    + cache.getId() + ": " + exception.getMessage());
            return "failed";
        }
    }

    private void processPendingForVideo(String videoId) {
        Set<String> requestIds = pendingRequestsByVideo.get(videoId);
        if (requestIds == null || requestIds.isEmpty()) {
            return;
        }

        for (String requestId : new ArrayList<>(requestIds)) {
            ConcurrentHashMap<String, String> outcomes =
                    requestOutcomes.get(requestId);
            if (outcomes == null) {
                requestIds.remove(requestId);
                continue;
            }

            for (String cacheId : new ArrayList<>(outcomes.keySet())) {
                if (!"queued".equals(outcomes.get(cacheId))) {
                    continue;
                }
                String outcome = tryRemoveQueuedCache(videoId, cacheId);
                if (!"queued".equals(outcome)) {
                    outcomes.put(cacheId, outcome);
                    requestUpdatedAt.put(requestId, System.currentTimeMillis());
                }
            }
            updatePendingRegistration(requestId);
        }
    }

    private String tryRemoveQueuedCache(String videoId, String cacheId) {
        VideoDescriptor requested = Cache.altIdToVideoDescriptor(cacheId);
        if (requested == null || !isHls(requested)) {
            return "failed";
        }

        boolean downloading = false;
        boolean failed = false;
        for (VideoDescriptor candidate
                : new ArrayList<>(Cache.getVideos(videoId))) {
            if (!sameHlsVariant(requested, candidate)) {
                continue;
            }
            Cache cache = new Cache(candidate);
            boolean exists = cache.exists();
            boolean hasTemporary = cache.tmpCachedSize() >= 0;
            boolean isDownloading = Cache.getDLFlag(candidate);
            if (!exists && !hasTemporary && !isDownloading) {
                continue;
            }
            if (isDownloading) {
                downloading = true;
                continue;
            }
            String outcome = removeSettledCache(candidate, cache);
            if ("queued".equals(outcome)) {
                downloading = true;
            } else if ("failed".equals(outcome)) {
                failed = true;
            }
        }

        if (downloading) {
            return "queued";
        }
        if (failed) {
            return "failed";
        }
        // 見つからない場合も、要求されたHLSが存在しないという目標状態に達している。
        return "deleted";
    }

    private boolean sameHlsVariant(
            VideoDescriptor requested, VideoDescriptor candidate) {
        return isHls(candidate)
                && requested.stripSrcId().equals(candidate.stripSrcId());
    }

    private boolean isHls(VideoDescriptor video) {
        return video != null && Cache.HLS.equals(video.getPostfix());
    }

    private void updatePendingRegistration(String requestId) {
        String videoId = requestVideoIds.get(requestId);
        ConcurrentHashMap<String, String> outcomes = requestOutcomes.get(requestId);
        if (videoId == null || outcomes == null) {
            return;
        }

        boolean hasQueued = outcomes.containsValue("queued");
        if (hasQueued) {
            pendingRequestsByVideo.computeIfAbsent(
                    videoId, ignored -> ConcurrentHashMap.newKeySet())
                    .add(requestId);
        } else {
            Set<String> requestIds = pendingRequestsByVideo.get(videoId);
            if (requestIds != null) {
                requestIds.remove(requestId);
                if (requestIds.isEmpty()) {
                    pendingRequestsByVideo.remove(videoId, requestIds);
                }
            }
        }
    }

    @Override
    public int onSystemEvent(int id, EventSource source) {
        try {
            if (id == PERIODIC_CALL) {
                for (String videoId
                        : new ArrayList<>(pendingRequestsByVideo.keySet())) {
                    processPendingForVideo(videoId);
                }
                cleanupOldRequests();
            } else if ((id == CACHE_COMPLETED || id == CACHE_SUSPENDED)
                    && source != null && source.getCache() != null) {
                processPendingForVideo(source.getCache().getVideoId());
            }
        } catch (RuntimeException exception) {
            Logger.warning("FilterMatomeCacheControl: event processing failed: "
                    + exception.getMessage());
        }
        return RESULT_OK;
    }

    private void cleanupOldRequests() {
        long now = System.currentTimeMillis();
        for (String requestId : new ArrayList<>(requestUpdatedAt.keySet())) {
            Long updatedAt = requestUpdatedAt.get(requestId);
            ConcurrentHashMap<String, String> outcomes =
                    requestOutcomes.get(requestId);
            if (updatedAt == null || outcomes == null) {
                removeRequest(requestId);
                continue;
            }

            boolean pending = outcomes.containsValue("queued");
            long ttl = pending
                    ? PENDING_REQUEST_TTL_MS : COMPLETED_REQUEST_TTL_MS;
            if (now - updatedAt <= ttl) {
                continue;
            }
            if (pending) {
                for (String cacheId : new ArrayList<>(outcomes.keySet())) {
                    outcomes.replace(cacheId, "queued", "expired");
                }
                requestUpdatedAt.put(requestId, now);
                updatePendingRegistration(requestId);
            } else {
                removeRequest(requestId);
            }
        }
    }

    private void removeRequest(String requestId) {
        String videoId = requestVideoIds.remove(requestId);
        requestOutcomes.remove(requestId);
        requestUpdatedAt.remove(requestId);
        if (videoId == null) {
            return;
        }
        Set<String> requestIds = pendingRequestsByVideo.get(videoId);
        if (requestIds != null) {
            requestIds.remove(requestId);
            if (requestIds.isEmpty()) {
                pendingRequestsByVideo.remove(videoId, requestIds);
            }
        }
    }

    private Resource createRequestResponse(String requestId) {
        ConcurrentHashMap<String, String> outcomes =
                requestOutcomes.get(requestId);
        String videoId = requestVideoIds.get(requestId);
        if (outcomes == null || videoId == null) {
            return StringResource.getNotFound();
        }

        StringBuilder json = new StringBuilder(512);
        json.append('{');
        appendJsonStringField(json, "requestId", requestId, false);
        appendJsonStringField(json, "videoId", videoId, true);
        appendJsonStringField(json, "status", getOverallStatus(outcomes), true);
        json.append(",\"target\":\"hls\"");
        json.append(",\"preservesNonHls\":true");
        json.append(",\"results\":[");

        List<String> cacheIds = new ArrayList<>(outcomes.keySet());
        Collections.sort(cacheIds);
        boolean needsComma = false;
        for (String cacheId : cacheIds) {
            if (needsComma) {
                json.append(',');
            }
            needsComma = true;
            json.append('{');
            appendJsonStringField(json, "cacheId", cacheId, false);
            appendJsonStringField(json, "outcome", outcomes.get(cacheId), true);
            json.append('}');
        }
        json.append("]}");
        return createJsonResource(json.toString());
    }

    private String getOverallStatus(ConcurrentHashMap<String, String> outcomes) {
        if (outcomes.isEmpty()) {
            return "not_found";
        }
        boolean queued = outcomes.containsValue("queued");
        boolean failed = outcomes.containsValue("failed")
                || outcomes.containsValue("expired");
        boolean succeeded = outcomes.containsValue("deleted")
                || outcomes.containsValue("not_found");
        if (queued) {
            return "pending";
        }
        if (failed) {
            return succeeded ? "partial" : "failed";
        }
        return "completed";
    }

    private String readRequestBody(Socket browser, int contentLength)
            throws IOException {
        byte[] body = new byte[contentLength];
        InputStream input = browser.getInputStream();
        int offset = 0;
        while (offset < body.length) {
            int read = input.read(body, offset, body.length - offset);
            if (read < 0) {
                throw new IOException("request body ended unexpectedly");
            }
            offset += read;
        }
        return new String(body, StandardCharsets.UTF_8);
    }

    private String getRequiredString(JsonObject object, String key) {
        JsonValue value = object.get(key);
        if (value == null || value.isNull()) {
            throw new IllegalArgumentException("missing " + key);
        }
        String result = value.getString();
        if (result == null || result.isEmpty()) {
            throw new IllegalArgumentException("invalid " + key);
        }
        return result;
    }

    private String getOptionalString(
            JsonObject object, String key, String defaultValue) {
        JsonValue value = object.get(key);
        if (value == null || value.isNull()) {
            return defaultValue;
        }
        String result = value.getString();
        if (result == null) {
            throw new IllegalArgumentException("invalid " + key);
        }
        return result;
    }

    private String getQueryParameter(String query, String expectedKey) {
        if (query == null || query.isEmpty()) {
            return null;
        }
        try {
            for (String parameter : query.split("&")) {
                String[] pair = parameter.split("=", 2);
                String key = URLDecoder.decode(
                        pair[0], StandardCharsets.UTF_8);
                if (!expectedKey.equals(key) || pair.length != 2) {
                    continue;
                }
                return URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
            }
        } catch (IllegalArgumentException exception) {
            return null;
        }
        return null;
    }

    private Resource createJsonResource(String json) {
        StringResource response = new StringResource(json);
        response.addResponseHeader(
                HttpHeader.CONTENT_TYPE, "application/json; charset=utf-8");
        response.addResponseHeader("X-Content-Type-Options", "nosniff");
        response.addNoCacheResponseHeaders();
        return response;
    }

    private void appendJsonStringField(
            StringBuilder json, String key, String value, boolean leadingComma) {
        if (leadingComma) {
            json.append(',');
        }
        json.append('"').append(TextUtil.escapeJSON(key)).append("\":\"")
                .append(TextUtil.escapeJSON(value)).append('"');
    }
}
