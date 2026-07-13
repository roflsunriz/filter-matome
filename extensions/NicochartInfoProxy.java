package extensions;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.Socket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import dareka.common.Logger;
import dareka.extensions.Extension2;
import dareka.extensions.ExtensionManager;
import dareka.processor.HttpHeader;
import dareka.processor.HttpRequestHeader;
import dareka.processor.Processor;
import dareka.processor.Resource;
import dareka.processor.StringResource;

/**
 * Exposes one same-origin endpoint for the video-player's last-resort
 * nicochart.jp metadata lookup. The remote host and path are not user
 * controllable, so this processor cannot be used as a general HTTP proxy.
 */
public final class NicochartInfoProxy implements Extension2, Processor {

    public static final int REVISION = 260713;
    public static final String VER_STRING = "NicochartInfoProxy_" + REVISION;

    private static final Pattern SUPPORTED_URL = Pattern.compile(
            "^https?://www\\.nicovideo\\.jp/cache/nicochart-info/([a-z]{2}\\d+)$",
            Pattern.CASE_INSENSITIVE);
    private static final String[] SUPPORTED_METHODS = { "GET" };
    private static final String REQUEST_HEADER = "X-Filter-Matome-Nicochart";
    private static final int CONNECT_TIMEOUT_MS = 5_000;
    private static final int READ_TIMEOUT_MS = 10_000;
    private static final int MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

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

        String videoId = matcher.group(1).toLowerCase(Locale.ROOT);
        String html;
        try {
            html = fetchNicochartPage(videoId);
        } catch (IOException exception) {
            Logger.warning("NicochartInfoProxy: failed to fetch " + videoId
                    + ": " + exception.getMessage());
            return StringResource.getNotFound();
        }

        StringResource response = new StringResource(html);
        // Serve as plain text so remote HTML can never execute in the
        // www.nicovideo.jp origin. The browser parses it with DOMParser.
        response.addResponseHeader(HttpHeader.CONTENT_TYPE, "text/plain; charset=utf-8");
        response.addNoCacheResponseHeaders();
        return response;
    }

    private String fetchNicochartPage(String videoId) throws IOException {
        URL url = new URL("https://www.nicochart.jp/watch/" + videoId);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection(Proxy.NO_PROXY);
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("Accept", "text/html");
        connection.setRequestProperty("User-Agent", "filter-matome video-player/1.0");

        try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
                throw new IOException("nicochart.jp returned HTTP " + status);
            }
            try (InputStream input = connection.getInputStream()) {
                return new String(readLimited(input), StandardCharsets.UTF_8);
            }
        } finally {
            connection.disconnect();
        }
    }

    private byte[] readLimited(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16 * 1024];
        int total = 0;
        int read;
        while ((read = input.read(buffer)) >= 0) {
            total += read;
            if (total > MAX_RESPONSE_BYTES) {
                throw new IOException("nicochart.jp response exceeded size limit");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }
}
