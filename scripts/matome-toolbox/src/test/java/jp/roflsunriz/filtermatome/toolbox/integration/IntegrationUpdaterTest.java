package jp.roflsunriz.filtermatome.toolbox.integration;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import jp.roflsunriz.filtermatome.toolbox.plugins.UpdaterPlugin;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class IntegrationUpdaterTest {
    @TempDir
    Path temp;

    @Test
    void updaterDownloadsPartFileSafelyAndUsesEtag304() throws Exception {
        AtomicInteger releaseRequests = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/releases/latest", exchange -> {
            releaseRequests.incrementAndGet();
            if ("\"test-etag\"".equals(exchange.getRequestHeaders().getFirst("If-None-Match"))) {
                exchange.sendResponseHeaders(304, -1);
                exchange.close();
                return;
            }
            int port = server.getAddress().getPort();
            String body = "{\"id\":42,\"name\":\"test release\",\"tag_name\":\"v1\","
                    + "\"draft\":false,\"prerelease\":false,\"assets\":["
                    + "{\"name\":\"tool.txt\",\"browser_download_url\":\"http://127.0.0.1:"
                    + port + "/assets/tool.txt\"},"
                    + "{\"name\":\"../outside.txt\",\"browser_download_url\":\"http://127.0.0.1:"
                    + port + "/assets/tool.txt\"}]}";
            exchange.getResponseHeaders().add("ETag", "\"test-etag\"");
            respond(exchange, 200, body.getBytes(StandardCharsets.UTF_8));
        });
        server.createContext("/assets/tool.txt", exchange -> respond(exchange, 200,
                "downloaded safely".getBytes(StandardCharsets.UTF_8)));
        server.start();
        try {
            Path repo = Files.createDirectories(temp.resolve("repo"));
            PluginContext context = TestSupport.context(temp.resolve("data"), repo);
            context.config().set("updater.apiUrl", "http://127.0.0.1:" + server.getAddress().getPort()
                    + "/releases/latest");
            Path target = temp.resolve("download dir");
            CommandRequest request = TestSupport.request("check", List.of(), Map.of(), false, false, false, true,
                    target);

            assertEquals(0, new UpdaterPlugin().run(request, context));
            assertEquals("downloaded safely", Files.readString(target.resolve("tool.txt")));
            assertFalse(Files.exists(temp.resolve("outside.txt")));
            assertFalse(Files.exists(target.resolve("tool.txt.part")));
            assertEquals("42", context.config().get("updater.lastReleaseId", ""));

            assertEquals(0, new UpdaterPlugin().run(request, context));
            assertEquals(2, releaseRequests.get());
        } finally {
            server.stop(0);
        }
    }

    private static void respond(HttpExchange exchange, int status, byte[] body) throws java.io.IOException {
        exchange.sendResponseHeaders(status, body.length);
        try (var output = exchange.getResponseBody()) {
            output.write(body);
        }
    }
}
