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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2EIsolatedMediaTest {
    @TempDir
    Path temp;

    @Test
    void everyMediaActionRunsAgainstFakeToolsInAnIsolatedDirectory() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        Path inputDirectory = Files.createDirectories(environment.root().resolve("入力 動画"));
        Path outputDirectory = Files.createDirectories(environment.root().resolve("出力"));
        Path ffmpeg = environment.tool("ffmpeg");
        Path ffprobe = environment.tool("ffprobe");

        Path cutInput = mediaFile(inputDirectory, "cut input.mp4");
        runMedia(environment, "cut10", cutInput, outputDirectory, ffmpeg, ffprobe);
        assertRegular(outputDirectory.resolve("10s_cut input.mp4"));
        Path cutAliasInput = mediaFile(inputDirectory, "cut alias.mp4");
        runMedia(environment, "10s-cut", cutAliasInput, outputDirectory, ffmpeg, ffprobe);
        assertRegular(outputDirectory.resolve("10s_cut alias.mp4"));

        Path cut60Input = mediaFile(inputDirectory, "cut60 input.mp4");
        runMedia(environment, "cut60", cut60Input, outputDirectory, ffmpeg, ffprobe);
        assertRegular(outputDirectory.resolve("60s_cut60 input.mp4"));
        Path cut60AliasInput = mediaFile(inputDirectory, "cut60 alias.mp4");
        runMedia(environment, "60s-cut", cut60AliasInput, outputDirectory, ffmpeg, ffprobe);
        assertRegular(outputDirectory.resolve("60s_cut60 alias.mp4"));

        Path fastStartInput = mediaFile(inputDirectory, "fast input.mp4");
        runMedia(environment, "faststart", fastStartInput, outputDirectory, ffmpeg, ffprobe);
        Path fastStartOutput = outputDirectory.resolve("fast input_faststart.mp4");
        assertRegular(fastStartOutput);
        String completedFastStart = Files.readString(fastStartOutput);
        runMedia(environment, "faststart", fastStartInput, outputDirectory, ffmpeg, ffprobe);
        assertEquals(completedFastStart, Files.readString(fastStartOutput), "既存出力を既定で保護できていません。");
        runMedia(environment, "faststart", fastStartInput, outputDirectory, ffmpeg, ffprobe, "--overwrite");
        assertTrue(hasBackup(fastStartOutput), "上書き前のバックアップが作成されていません。");

        for (String mode : List.of("h264", "hevc", "av1", "adaptive")) {
            Path convertInput = mediaFile(inputDirectory, "convert " + mode + ".mp4");
            runMedia(environment, "convert", convertInput, outputDirectory, ffmpeg, ffprobe, "--mode=" + mode);
            assertRegular(outputDirectory.resolve("convert_convert " + mode + "_" + mode + ".mp4"));
        }
        Path transcodeInput = mediaFile(inputDirectory, "transcode alias.mp4");
        runMedia(environment, "transcode", transcodeInput, outputDirectory, ffmpeg, ffprobe, "--mode=hevc");
        assertRegular(outputDirectory.resolve("convert_transcode alias_hevc.mp4"));

        Path hlsInput = mediaFile(inputDirectory, "hls input.mp4");
        runMedia(environment, "hls", hlsInput, outputDirectory, ffmpeg, ffprobe);
        Path hlsOutput = outputDirectory.resolve("hls input.HLS");
        assertRegular(hlsOutput.resolve("master.m3u8"));
        String master = Files.readString(hlsOutput.resolve("master.m3u8"));
        assertTrue(master.contains("video.m3u8"));
        assertTrue(Files.readString(hlsOutput.resolve("video.m3u8")).contains("video/init01.cmfv"));
        assertTrue(Files.exists(hlsOutput.resolve("audio/001.cmfa")));
        assertFalse(Files.exists(outputDirectory.resolve("hls input.HLS.part")));

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/watch", exchange -> respond(exchange, 200,
                "{\"data\":{\"video\":{\"title\":\"隔離タイトル\",\"isDeleted\":false,\"isPrivate\":false}}}"));
        server.createContext("/legacy", exchange -> respond(exchange, 404, ""));
        server.start();
        try {
            Files.writeString(environment.data().resolve("app.properties"),
                    "media.watchApiUrl=http://127.0.0.1:" + server.getAddress().getPort() + "/watch\n"
                            + "media.legacyApiUrl=http://127.0.0.1:" + server.getAddress().getPort() + "/legacy\n");
            Path renameInput = mediaFile(inputDirectory, "sm123.mp4");
            runMedia(environment, "rename", renameInput, outputDirectory, ffmpeg, ffprobe, "--yes");
            assertRegular(inputDirectory.resolve("sm123[720p,192]_隔離タイトル.mp4"));
            assertFalse(Files.exists(renameInput));
        } finally {
            server.stop(0);
        }

        String toolLog = environment.toolLogText();
        assertTrue(toolLog.contains("ffmpeg"), "ffmpegの外部コマンド境界を通っていません。");
        assertTrue(toolLog.contains("ffprobe"), "ffprobeの外部コマンド境界を通っていません。");
    }

    private static void runMedia(IsolatedEnvironment environment, String action, Path input, Path output,
                                 Path ffmpeg, Path ffprobe, String... extra) throws Exception {
        List<String> arguments = environment.plugin("media", action);
        arguments.add("--input=" + input);
        arguments.add("--output=" + output);
        arguments.add("--ffmpeg=" + ffmpeg);
        arguments.add("--ffprobe=" + ffprobe);
        arguments.addAll(List.of(extra));
        var result = environment.run(arguments);
        assertEquals(0, result.exitCode(), () -> action + " が失敗しました:\n" + result.output());
    }

    private static Path mediaFile(Path directory, String name) throws Exception {
        Path file = directory.resolve(name);
        Files.writeString(file, "input media", StandardCharsets.UTF_8);
        return file;
    }

    private static void assertRegular(Path path) {
        assertTrue(Files.isRegularFile(path), "成果物がありません: " + path);
    }

    private static boolean hasBackup(Path original) throws Exception {
        try (var files = Files.list(original.getParent())) {
            return files.anyMatch(path -> path.getFileName().toString().startsWith(original.getFileName() + ".bak-"));
        }
    }

    private static void respond(HttpExchange exchange, int status, String body) throws java.io.IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
