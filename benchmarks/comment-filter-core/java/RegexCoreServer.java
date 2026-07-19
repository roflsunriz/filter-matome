import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

public final class RegexCoreServer {
    private static final String REQUIRED_HEADER = "X-Filter-Matome-Benchmark";
    private static final int MAX_REQUEST_BYTES = 64 * 1024 * 1024;

    private volatile List<Pattern> rules = List.of();
    private volatile List<String> bodies = List.of();

    public static void main(String[] args) throws Exception {
        RegexCoreServer application = new RegexCoreServer();
        HttpServer server = HttpServer.create(
                new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/compile", application::handleCompile);
        server.createContext("/load-bodies", application::handleLoadBodies);
        server.createContext("/match-loaded", application::handleMatchLoaded);
        server.createContext("/match-batch", application::handleMatchBatch);
        server.setExecutor(Executors.newSingleThreadExecutor());
        server.start();
        System.out.println(server.getAddress().getPort());
        System.out.flush();
    }

    private void handleCompile(HttpExchange exchange) throws IOException {
        if (!isAuthorizedPost(exchange)) {
            return;
        }

        try {
            byte[] payload = readRequest(exchange);
            long decodeStarted = System.nanoTime();
            List<String> patterns = decodeStringList(payload);
            long decodeNanos = System.nanoTime() - decodeStarted;
            long compileStarted = System.nanoTime();
            List<Pattern> compiled = new ArrayList<>(patterns.size());
            for (String pattern : patterns) {
                compiled.add(Pattern.compile(
                        pattern, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE));
            }
            rules = List.copyOf(compiled);
            long compileNanos = System.nanoTime() - compileStarted;
            writeTimingResponse(exchange, decodeNanos, compileNanos, new int[0]);
        } catch (IllegalArgumentException exception) {
            writeError(exchange, 400, exception.getMessage());
        }
    }

    private void handleLoadBodies(HttpExchange exchange) throws IOException {
        if (!isAuthorizedPost(exchange)) {
            return;
        }

        try {
            byte[] payload = readRequest(exchange);
            long decodeStarted = System.nanoTime();
            bodies = List.copyOf(decodeStringList(payload));
            long decodeNanos = System.nanoTime() - decodeStarted;
            writeTimingResponse(exchange, decodeNanos, 0L, new int[0]);
        } catch (IllegalArgumentException exception) {
            writeError(exchange, 400, exception.getMessage());
        }
    }

    private void handleMatchLoaded(HttpExchange exchange) throws IOException {
        if (!isAuthorizedPost(exchange)) {
            return;
        }

        int[] results = new int[bodies.size()];
        long matchStarted = System.nanoTime();
        matchBodies(rules, bodies, results);
        long matchNanos = System.nanoTime() - matchStarted;
        writeTimingResponse(exchange, 0L, matchNanos, results);
    }

    private void handleMatchBatch(HttpExchange exchange) throws IOException {
        if (!isAuthorizedPost(exchange)) {
            return;
        }

        try {
            byte[] payload = readRequest(exchange);
            long decodeStarted = System.nanoTime();
            List<String> requestBodies = decodeStringList(payload);
            long decodeNanos = System.nanoTime() - decodeStarted;
            int[] results = new int[requestBodies.size()];
            long matchStarted = System.nanoTime();
            matchBodies(rules, requestBodies, results);
            long matchNanos = System.nanoTime() - matchStarted;
            writeTimingResponse(exchange, decodeNanos, matchNanos, results);
        } catch (IllegalArgumentException exception) {
            writeError(exchange, 400, exception.getMessage());
        }
    }

    private static void matchBodies(
            List<Pattern> rules, List<String> bodies, int[] results) {
        for (int bodyIndex = 0; bodyIndex < bodies.size(); bodyIndex++) {
            String body = bodies.get(bodyIndex);
            int matchedRule = -1;
            for (int ruleIndex = 0; ruleIndex < rules.size(); ruleIndex++) {
                if (rules.get(ruleIndex).matcher(body).find()) {
                    matchedRule = ruleIndex;
                    break;
                }
            }
            results[bodyIndex] = matchedRule;
        }
    }

    private static List<String> decodeStringList(byte[] payload) {
        ByteBuffer buffer = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN);
        if (buffer.remaining() < Integer.BYTES) {
            throw new IllegalArgumentException("missing string count");
        }
        int count = buffer.getInt();
        if (count < 0) {
            throw new IllegalArgumentException("invalid string count");
        }

        List<String> values = new ArrayList<>(count);
        for (int index = 0; index < count; index++) {
            if (buffer.remaining() < Integer.BYTES) {
                throw new IllegalArgumentException("missing string length");
            }
            int byteLength = buffer.getInt();
            if (byteLength < 0 || buffer.remaining() < byteLength) {
                throw new IllegalArgumentException("invalid string length");
            }
            byte[] encoded = new byte[byteLength];
            buffer.get(encoded);
            values.add(new String(encoded, StandardCharsets.UTF_8));
        }
        if (buffer.hasRemaining()) {
            throw new IllegalArgumentException("unexpected trailing bytes");
        }
        return values;
    }

    private static byte[] readRequest(HttpExchange exchange) throws IOException {
        int contentLength = 0;
        String lengthHeader = exchange.getRequestHeaders().getFirst("Content-Length");
        if (lengthHeader != null) {
            contentLength = Integer.parseInt(lengthHeader);
        }
        if (contentLength < 0 || contentLength > MAX_REQUEST_BYTES) {
            throw new IllegalArgumentException("request body is too large");
        }

        ByteArrayOutputStream output = new ByteArrayOutputStream(
                Math.max(contentLength, 1024));
        byte[] buffer = new byte[16 * 1024];
        int total = 0;
        int read;
        while ((read = exchange.getRequestBody().read(buffer)) >= 0) {
            total += read;
            if (total > MAX_REQUEST_BYTES) {
                throw new IllegalArgumentException("request body is too large");
            }
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private static boolean isAuthorizedPost(HttpExchange exchange)
            throws IOException {
        if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            writeError(exchange, 405, "method not allowed");
            return false;
        }
        if (!"1".equals(exchange.getRequestHeaders().getFirst(REQUIRED_HEADER))) {
            writeError(exchange, 404, "not found");
            return false;
        }
        return true;
    }

    private static void writeTimingResponse(
            HttpExchange exchange, long decodeNanos, long matchNanos, int[] results)
            throws IOException {
        ByteBuffer response = ByteBuffer
                .allocate(Long.BYTES * 2 + Integer.BYTES + results.length * Integer.BYTES)
                .order(ByteOrder.LITTLE_ENDIAN);
        response.putLong(decodeNanos);
        response.putLong(matchNanos);
        response.putInt(results.length);
        for (int result : results) {
            response.putInt(result);
        }
        byte[] bytes = response.array();
        exchange.getResponseHeaders().set("Content-Type", "application/octet-stream");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    private static void writeError(HttpExchange exchange, int status, String message)
            throws IOException {
        byte[] body = message.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
        exchange.close();
    }
}
