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
 * 実機のffmpeg、Java、レジストリ、証明書ストアを呼ばずに外部コマンド境界を検証する偽実装。
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
        if (command.contains("-version")) {
            System.out.println("fake-" + kind + " version 1.0");
            return;
        }
        switch (kind) {
            case "ffprobe" -> fakeFfprobe(command);
            case "ffmpeg" -> fakeFfmpeg(command);
            case "javac" -> fakeJavac(command);
            case "java", "reg", "certutil" -> {
                // 成功終了だけで、実機のプロセス・レジストリ・証明書ストアは変更しない。
            }
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
            System.out.println("video,h264,1920,720,5000000");
            System.out.println("audio,aac,0,0,192000");
            System.out.println("format,mp4");
        }
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

    private static void fakeJavac(List<String> command) throws IOException {
        int destinationIndex = command.indexOf("-d");
        if (destinationIndex < 0 || destinationIndex + 1 >= command.size()) {
            throw new IllegalArgumentException("偽javacに-dがありません: " + command);
        }
        Path destination = Path.of(command.get(destinationIndex + 1));
        String source = command.get(command.size() - 1);
        String fileName = Path.of(source).getFileName().toString().replaceFirst("\\.java$", ".class");
        Files.createDirectories(destination);
        Files.writeString(destination.resolve(fileName), "fake class", StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
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
