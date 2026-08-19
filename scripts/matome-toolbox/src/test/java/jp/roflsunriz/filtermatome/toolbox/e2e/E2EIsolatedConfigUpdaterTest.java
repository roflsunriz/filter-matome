package jp.roflsunriz.filtermatome.toolbox.e2e;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2EIsolatedConfigUpdaterTest {
    @TempDir
    Path temp;

    @Test
    void configEditorCoversDictionaryAliasesBackupsAndDeletionInTheChildProcess() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        Path config = environment.repo().resolve("config.properties");
        Path defaults = Files.createDirectories(environment.repo().resolve("defaults"));
        Files.writeString(config, "# 利用者コメント\nold.key=old\n", StandardCharsets.UTF_8);
        Files.writeString(defaults.resolve("default.properties"), "# 辞書コメント\ndefault.key=default\n", StandardCharsets.UTF_8);

        assertSuccess(environment.run(configCommand(environment, "available", config, defaults)));
        assertSuccess(environment.run(configCommand(environment, "defaults", config, defaults)));
        assertSuccess(environment.run(configCommand(environment, "set", config, defaults,
                "--key=new.key", "--value=first")));
        assertSuccess(environment.run(configCommand(environment, "add", config, defaults,
                "--key=default.key", "--value=")));
        assertSuccess(environment.run(configCommand(environment, "edit", config, defaults,
                "--key=new.key", "--value=edited")));
        assertSuccess(environment.run(configCommand(environment, "list", config, defaults)));
        assertSuccess(environment.run(configCommand(environment, "show", config, defaults)));

        List<String> removeWithoutConfirmation = configCommand(environment, "remove", config, defaults,
                "--key=old.key");
        assertNotEquals(0, environment.run(removeWithoutConfirmation).exitCode(), "削除確認を迂回できています。");
        assertSuccess(environment.run(configCommand(environment, "remove", config, defaults,
                "--key=old.key", "--yes")));
        assertSuccess(environment.run(configCommand(environment, "delete", config, defaults,
                "--key=new.key", "--yes")));

        String saved = Files.readString(config);
        assertTrue(saved.contains("default.key=default"));
        assertFalse(saved.contains("old.key=old"));
        assertFalse(saved.contains("new.key=edited"));
        assertTrue(saved.contains("辞書コメント"), "defaults由来のコメントが保持されていません。");
        try (var files = Files.list(config.getParent())) {
            assertTrue(files.anyMatch(path -> path.getFileName().toString().startsWith("config.properties.bak-")),
                    "設定保存前のバックアップがありません。");
        }
    }

    @Test
    void updaterUsesOnlyTheLocalReleaseServerAndPersistsEtagAcrossChildProcesses() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        AtomicInteger releaseRequests = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/releases/latest", exchange -> {
            releaseRequests.incrementAndGet();
            if ("\"isolated-etag\"".equals(exchange.getRequestHeaders().getFirst("If-None-Match"))) {
                exchange.sendResponseHeaders(304, -1);
                exchange.close();
                return;
            }
            int port = server.getAddress().getPort();
            String body = "{\"id\":99,\"name\":\"isolated release\",\"tag_name\":\"v-e2e\","
                    + "\"draft\":false,\"prerelease\":false,\"assets\":[{"
                    + "\"name\":\"tool.txt\",\"browser_download_url\":\"http://127.0.0.1:"
                    + port + "/assets/tool.txt\"}]}";
            exchange.getResponseHeaders().add("ETag", "\"isolated-etag\"");
            respond(exchange, 200, body);
        });
        server.createContext("/assets/tool.txt", exchange -> respond(exchange, 200,
                "downloaded in isolation"));
        server.start();
        try {
            Files.writeString(environment.data().resolve("app.properties"),
                    "updater.apiUrl=http://127.0.0.1:" + server.getAddress().getPort() + "/releases/latest\n");
            Path target = environment.root().resolve("downloads");
            List<String> arguments = environment.plugin("updater", "check");
            arguments.add("--output=" + target);
            var first = environment.run(arguments);
            assertSuccess(first);
            assertEquals("downloaded in isolation", Files.readString(target.resolve("tool.txt")));
            assertFalse(Files.exists(target.resolve("tool.txt.part")));

            var downloadArguments = environment.plugin("updater", "download");
            downloadArguments.add("--output=" + target);
            var second = environment.run(downloadArguments);
            assertSuccess(second);
            assertTrue(second.output().contains("304"), second.output());
            assertEquals(2, releaseRequests.get(), "更新API以外へ接続せず、ETagを子プロセス間で利用できていません。");
        } finally {
            server.stop(0);
        }
    }

    private static List<String> configCommand(IsolatedEnvironment environment, String action, Path config,
                                               Path defaults, String... extra) {
        var arguments = environment.plugin("config-editor", action);
        arguments.add("--config=" + config);
        arguments.add("--defaults=" + defaults);
        arguments.addAll(List.of(extra));
        return arguments;
    }

    private static void assertSuccess(jp.roflsunriz.filtermatome.toolbox.ProcessResult result) {
        assertEquals(0, result.exitCode(), result.output());
    }

    private static void respond(HttpExchange exchange, int status, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
