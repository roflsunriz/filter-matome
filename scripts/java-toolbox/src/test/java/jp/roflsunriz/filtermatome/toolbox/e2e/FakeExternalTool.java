package jp.roflsunriz.filtermatome.toolbox.e2e;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * 実機のffmpeg、ffprobe、GPACを呼ばずに外部コマンド境界を検証する偽実装。
 * テスト用ラッパーから呼び出され、受け取った引数をログへ残して最小限の成果物を生成する。
 */
public final class FakeExternalTool {
    private static final String LOG_ENV = "FILTER_MATOME_FAKE_TOOL_LOG";

    private FakeExternalTool() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            throw new IllegalArgumentException("偽外部コマンドの種類が指定されていません。");
        }
        String kind = args[0];
        List<String> command = Arrays.asList(args).subList(1, args.length);
        appendLog(kind, command);
        if (command.contains("-version") || command.contains("-h")) {
            System.out.println("fake-" + kind + " version 1.0");
            return;
        }
        switch (kind) {
            case "ffprobe" -> fakeFfprobe(command);
            case "ffmpeg" -> fakeFfmpeg(command);
            case "gpac" -> fakeGpac(command);
            default -> throw new IllegalArgumentException("未対応の偽コマンドです: " + kind);
        }
    }

    private static void fakeFfprobe(List<String> command) {
        String joined = String.join(" ", command);
        if (joined.contains("stream=codec_name")) {
            System.out.println("h264");
            return;
        }
        if (joined.contains("stream=codec_type,codec_name,width,height,bit_rate")) {
            System.out.println("{\"streams\":["
                    + "{\"codec_type\":\"video\",\"codec_name\":\"h264\","
                    + "\"width\":1920,\"height\":720,\"bit_rate\":5000000},"
                    + "{\"codec_type\":\"audio\",\"codec_name\":\"aac\","
                    + "\"bit_rate\":192000}],"
                    + "\"format\":{\"format_name\":\"mov,mp4,m4a,3gp,3g2,mj2\"}}");
        }
    }

    private static void fakeGpac(List<String> command) {
        if (!command.contains("inspect:xml:stats:allp")) {
            return;
        }
        System.out.println("<GPACInspect>"
                + "<PIDConfigure StreamType=\"Visual\" CodecID=\"avc1\" "
                + "ServiceWidth=\"1920\" ServiceHeight=\"1080\"/>"
                + "<PIDConfigure StreamType=\"Audio\" CodecID=\"mp4a\" "
                + "Bitrate=\"160000\"/>"
                + "</GPACInspect>");
    }

    private static void fakeFfmpeg(List<String> command) throws IOException {
        Path workingDirectory = Path.of(System.getProperty("user.dir"));
        if (command.contains("video.m3u8") || command.contains("audio.m3u8")) {
            if (command.contains("video.m3u8")) {
                writePlaylist(workingDirectory.resolve("video.m3u8"), "video", ".cmfv");
            }
            if (command.contains("audio.m3u8")) {
                writePlaylist(workingDirectory.resolve("audio.m3u8"), "audio", ".cmfa");
            }
            return;
        }
        if (command.isEmpty()) {
            return;
        }
        Path output = workingDirectory.resolve(command.get(command.size() - 1)).normalize();
        Files.createDirectories(output.toAbsolutePath().getParent());
        Files.writeString(output, "fake media output" + System.lineSeparator(), StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    private static void writePlaylist(Path playlist, String directory, String extension) throws IOException {
        Path parent = playlist.getParent();
        Files.createDirectories(parent.resolve(directory));
        Files.writeString(parent.resolve(directory).resolve("init01" + extension), "fake init",
                StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        Files.writeString(parent.resolve(directory).resolve("001" + extension), "fake segment",
                StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        Files.writeString(playlist,
                "#EXTM3U\n#EXT-X-MAP:URI=\"init01" + extension + "\"\n#EXTINF:1,\n001" + extension
                        + "\n#EXT-X-ENDLIST\n",
                StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    }

    private static void appendLog(String kind, List<String> command) throws IOException {
        String rawLog = System.getenv(LOG_ENV);
        if (rawLog == null || rawLog.isBlank()) {
            return;
        }
        Path log = Path.of(rawLog);
        Files.createDirectories(log.toAbsolutePath().getParent());
        List<String> fields = new ArrayList<>();
        fields.add(kind);
        fields.addAll(command);
        Files.writeString(log, String.join("\t", fields) + System.lineSeparator(), StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    }
}
