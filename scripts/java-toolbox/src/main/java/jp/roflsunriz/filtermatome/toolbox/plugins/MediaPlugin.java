package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CancellationToken;
import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.FileSafety;
import jp.roflsunriz.filtermatome.toolbox.Json;
import jp.roflsunriz.filtermatome.toolbox.LogBus;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.ProcessRunner;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import javax.swing.TransferHandler;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.datatransfer.DataFlavor;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** ffmpeg/ffprobeを利用する動画系スクリプトの統合プラグイン。 */
public final class MediaPlugin implements ToolPlugin {
    private static final String WATCH_API_URL = "https://www.nicovideo.jp/api/watch/v3_guest";
    private static final String LEGACY_API_URL = "https://ext.nicovideo.jp/api/getthumbinfo";
    private static final Set<String> VIDEO_EXTENSIONS = Set.of(
            ".mp4", ".mkv", ".mov", ".avi", ".wmv", ".flv", ".ts", ".m2ts", ".webm");
    private static final Pattern VIDEO_ID = Pattern.compile("((?:sm|so|nm)\\d+)", Pattern.CASE_INSENSITIVE);

    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("media", "メディア変換", "ffmpeg/ffprobeによる変換、HLS、FastStart、切り出し、リネーム", true, true);
    }

    @Override
    public String readme() {
        return "メディア変換\n\n"
                + "対応アクション: cut10, cut60, faststart, hls, convert, rename\n"
                + "ffmpeg/ffprobeはPATHから自動検出します。設定画面がない環境では "
                + "--ffmpeg PATH --ffprobe PATH またはアプリ設定 tools.ffmpeg/tools.ffprobe を利用できます。\n\n"
                + "リネームの動画情報APIは media.watchApiUrl / media.legacyApiUrl で変更できます。\n\n"
                + "既定では既存ファイルを上書きせず、--overwrite を明示した場合だけ上書きします。"
                + "GUIでは上書き前に確認を表示し、変換途中のファイルは作業先に限定します。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new MediaPanel(this, context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        return execute(request, context, new CancellationToken());
    }

    private int execute(CommandRequest request, PluginContext context, CancellationToken token) throws Exception {
        if (request.inputs().isEmpty()) {
            throw new IOException("入力ファイルまたはフォルダを指定してください。");
        }
        String action = request.action().toLowerCase(Locale.ROOT);
        String ffmpeg = request.value("ffmpeg", context.config().get("tools.ffmpeg", "ffmpeg"));
        String ffprobe = request.value("ffprobe", context.config().get("tools.ffprobe", "ffprobe"));
        boolean needsProbe = action.equals("hls") || action.equals("rename")
                || request.value("mode", "").toLowerCase(Locale.ROOT).equals("adaptive");
        if (!request.dryRun() || (needsProbe && !request.dryRun())) {
            ensureTool(ffmpeg, "ffmpeg", context);
            if (needsProbe) {
                ensureTool(ffprobe, "ffprobe", context);
            }
        }

        Set<String> extensions = (action.equals("faststart") || action.equals("rename")) ? Set.of(".mp4") : VIDEO_EXTENSIONS;
        List<Path> inputs = FileSafety.collect(request.inputs(), extensions, request.recursive());
        if (inputs.isEmpty()) {
            context.log().warn("処理対象の動画が見つかりませんでした。");
            return 0;
        }
        context.log().info("処理対象: " + inputs.size() + "件 / action=" + action);

        return switch (action) {
            case "cut10", "10s-cut" -> processCuts(inputs, request, context, token, ffmpeg, 10);
            case "cut60", "60s-cut" -> processCuts(inputs, request, context, token, ffmpeg, 60);
            case "faststart" -> processFastStart(inputs, request, context, token, ffmpeg);
            case "hls" -> processHls(inputs, request, context, token, ffmpeg, ffprobe);
            case "convert", "transcode" -> processConvert(inputs, request, context, token, ffmpeg, ffprobe);
            case "rename" -> processRename(inputs, request, context, token, ffprobe);
            default -> throw new IllegalArgumentException("未対応のメディアアクションです: " + action);
        };
    }

    private int processCuts(List<Path> inputs, CommandRequest request, PluginContext context,
                            CancellationToken token, String ffmpeg, int seconds) throws Exception {
        int failures = 0;
        for (Path input : inputs) {
            Path output = outputFile(input, request.output(), seconds + "s_", input.getFileName().toString());
            if (!prepareFileOutput(input, output, request, context)) {
                continue;
            }
            Path part = partialOutput(output);
            List<String> command = new ArrayList<>(List.of(ffmpeg, "-hide_banner", "-nostdin", overwriteFlag(request),
                    "-i", input.toString(), "-t", Integer.toString(seconds), request.dryRun() ? output.toString() : part.toString()));
            boolean success = run(command, output.getParent(), request.dryRun(), context, token);
            if (success && !finalizeOutput(part, output, request.dryRun(), context)) success = false;
            if (!success && !request.dryRun()) Files.deleteIfExists(part);
            if (!success) {
                failures++;
            }
        }
        return failures == 0 ? 0 : 1;
    }

    private int processFastStart(List<Path> inputs, CommandRequest request, PluginContext context,
                                 CancellationToken token, String ffmpeg) throws Exception {
        int failures = 0;
        for (Path input : inputs) {
            if (input.getFileName().toString().toLowerCase().endsWith("_faststart.mp4")) {
                context.log().info("スキップ（既にFastStart名）: " + input);
                continue;
            }
            String stem = stem(input);
            Path output = outputFile(input, request.output(), "", stem + "_faststart.mp4");
            if (!prepareFileOutput(input, output, request, context)) {
                continue;
            }
            Path part = partialOutput(output);
            List<String> command = List.of(ffmpeg, "-hide_banner", "-nostdin", overwriteFlag(request), "-i", input.toString(),
                    "-c", "copy", "-movflags", "+faststart", request.dryRun() ? output.toString() : part.toString());
            boolean success = run(command, output.getParent(), request.dryRun(), context, token);
            if (success && !finalizeOutput(part, output, request.dryRun(), context)) success = false;
            if (!success && !request.dryRun()) Files.deleteIfExists(part);
            if (!success) {
                failures++;
            }
        }
        return failures == 0 ? 0 : 1;
    }

    private int processConvert(List<Path> inputs, CommandRequest request, PluginContext context,
                               CancellationToken token, String ffmpeg, String ffprobe) throws Exception {
        String mode = request.value("mode", "h264").toLowerCase(Locale.ROOT);
        int failures = 0;
        for (Path input : inputs) {
            boolean adaptiveCopy = !request.dryRun() && mode.equals("adaptive") && "h264".equals(probe(input, ffprobe, "video"));
            List<String> codec = new ArrayList<>();
            if (adaptiveCopy) {
                codec.addAll(List.of("-c:v", "copy", "-c:a", "aac"));
            } else {
                String videoCodec = switch (mode) {
                    case "hevc", "h265" -> "libx265";
                    case "av1" -> "libaom-av1";
                    default -> "libx264";
                };
                codec.addAll(List.of("-c:v", videoCodec, "-c:a", "aac"));
                if (videoCodec.equals("libx264")) {
                    codec.addAll(List.of("-preset", request.value("preset", "veryfast"), "-crf", request.value("crf", "20")));
                }
            }
            Path output = outputFile(input, request.output(), "convert_", stem(input) + "_" + mode + ".mp4");
            if (!prepareFileOutput(input, output, request, context)) {
                continue;
            }
            Path part = partialOutput(output);
            List<String> command = new ArrayList<>(List.of(ffmpeg, "-hide_banner", "-nostdin", overwriteFlag(request), "-i", input.toString(), "-map", "0"));
            command.addAll(codec);
            command.addAll(List.of("-movflags", "+faststart", request.dryRun() ? output.toString() : part.toString()));
            boolean success = run(command, output.getParent(), request.dryRun(), context, token);
            if (success && !finalizeOutput(part, output, request.dryRun(), context)) success = false;
            if (!success && !request.dryRun()) Files.deleteIfExists(part);
            if (!success) {
                failures++;
            }
        }
        return failures == 0 ? 0 : 1;
    }

    private int processHls(List<Path> inputs, CommandRequest request, PluginContext context,
                           CancellationToken token, String ffmpeg, String ffprobe) throws Exception {
        int failures = 0;
        for (Path input : inputs) {
            MediaInfo info = request.dryRun() ? new MediaInfo("h264", "aac", true, 5_000_000, 192_000)
                    : probeInfo(input, ffprobe);
            Path output = hlsDirectory(input, request.output());
            if (!prepareDirectoryOutput(output, request, context)) {
                continue;
            }
            Path work = request.dryRun() ? output : output.resolveSibling(output.getFileName() + ".part");
            if (!request.dryRun()) {
                if (Files.exists(work)) FileSafety.deleteTree(work);
                Files.createDirectories(work.resolve("video"));
                if (info.hasAudio()) {
                    Files.createDirectories(work.resolve("audio"));
                }
            }
            boolean copy = info.videoCodec().equalsIgnoreCase("h264") && info.formatName().contains("mp4");
            List<String> command = buildHlsCommand(input, work, info, copy, request, ffmpeg);
            if (!run(command, work, request.dryRun(), context, token)) {
                if (!request.dryRun()) FileSafety.deleteTree(work);
                failures++;
                continue;
            }
            if (!request.dryRun()) {
                prefixPlaylist(work.resolve("video.m3u8"), "video/");
                if (info.hasAudio()) {
                    prefixPlaylist(work.resolve("audio.m3u8"), "audio/");
                }
                writeMasterPlaylist(work, info, copy);
                finalizeDirectory(work, output, context);
            }
            context.log().info("HLS完了: " + input + " -> " + output);
        }
        return failures == 0 ? 0 : 1;
    }

    private int processRename(List<Path> inputs, CommandRequest request, PluginContext context,
                              CancellationToken token, String ffprobe) throws Exception {
        if (!request.dryRun() && !request.confirmed()) {
            throw new IllegalArgumentException("リネームは --yes/--apply またはGUIの確認が必要です。");
        }
        int failures = 0;
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        String watchApiUrl = context.config().get("media.watchApiUrl", WATCH_API_URL);
        String legacyApiUrl = context.config().get("media.legacyApiUrl", LEGACY_API_URL);
        for (Path input : inputs) {
            if (token.isCancelled()) {
                return 130;
            }
            Matcher matcher = VIDEO_ID.matcher(input.getFileName().toString());
            if (!matcher.find()) {
                context.log().warn("動画IDを判別できないためスキップ: " + input.getFileName());
                continue;
            }
            String id = matcher.group(1).toLowerCase();
            MediaInfo info = request.dryRun() ? new MediaInfo("", "", true, 0, 192_000) : probeInfo(input, ffprobe);
            String title = fetchTitle(http, id, context, watchApiUrl, legacyApiUrl);
            if (title == null || title.isBlank()) {
                context.log().warn("タイトルを取得できないためスキップ: " + input.getFileName());
                continue;
            }
            String resolution = info.height() > 0 ? info.height() + "p" : "720p";
            String bitrate = info.audioBitrate() > 0 ? Integer.toString(info.audioBitrate() / 1000) : "192";
            String name = id + "[" + resolution + "," + bitrate + "]_" + FileSafety.safeFileName(title) + ".mp4";
            Path output = input.resolveSibling(name);
            if (Files.exists(output) && !output.equals(input)) {
                context.log().warn("出力名が既に存在するためスキップ: " + output);
                continue;
            }
            context.log().info((request.dryRun() ? "DRY-RUN: " : "リネーム: ") + input.getFileName() + " -> " + name);
            if (!request.dryRun()) {
                Files.move(input, output);
            }
        }
        return failures == 0 ? 0 : 1;
    }

    private static void ensureTool(String executable, String label, PluginContext context) throws IOException, InterruptedException {
        try {
            ProcessResult result = context.processes().capture(List.of(executable, "-version"), null);
            if (!result.succeeded()) {
                throw new IOException(label + "を実行できません: " + executable);
            }
        } catch (IOException exception) {
            throw new IOException(label + "が見つかりません。PATHまたは設定 tools." + label + " を確認してください: " + executable, exception);
        }
    }

    private static boolean run(List<String> command, Path cwd, boolean dryRun, PluginContext context,
                               CancellationToken token) throws IOException, InterruptedException {
        if (dryRun) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return true;
        }
        ProcessResult result = context.processes().run(command, cwd, context.log(), token);
        if (!result.succeeded()) {
            context.log().error("コマンドが失敗しました (exit=" + result.exitCode() + ")");
            return false;
        }
        return true;
    }

    private static boolean prepareFileOutput(Path input, Path output, CommandRequest request, PluginContext context) throws IOException {
        FileSafety.ensureDifferent(input, output);
        if (Files.exists(output) && !request.overwrite()) {
            context.log().warn("出力が既に存在するためスキップ: " + output);
            return false;
        }
        if (request.overwrite() && Files.exists(output) && !request.dryRun()) {
            Path backup = FileSafety.backup(output);
            context.log().info("既存出力をバックアップしました: " + backup);
        }
        if (!request.dryRun()) {
            Files.createDirectories(output.getParent());
        }
        if (!request.dryRun()) Files.deleteIfExists(partialOutput(output));
        return true;
    }

    private static Path partialOutput(Path output) {
        String extension = FileSafety.extension(output);
        return output.resolveSibling(output.getFileName() + ".part" + extension);
    }

    private static boolean finalizeOutput(Path part, Path output, boolean dryRun, PluginContext context) throws IOException {
        if (dryRun) return true;
        if (!Files.exists(part)) {
            context.log().error("変換結果が生成されませんでした: " + part);
            return false;
        }
        try {
            Files.move(part, output, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } catch (java.nio.file.AtomicMoveNotSupportedException ignored) {
            Files.move(part, output, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        context.log().info("出力を確定しました: " + output);
        return true;
    }

    private static void finalizeDirectory(Path part, Path output, PluginContext context) throws IOException {
        try {
            Files.move(part, output, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
        } catch (java.nio.file.AtomicMoveNotSupportedException ignored) {
            Files.move(part, output, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        }
        context.log().info("HLS出力を確定しました: " + output);
    }

    private static boolean prepareDirectoryOutput(Path output, CommandRequest request, PluginContext context) throws IOException {
        if (Files.exists(output)) {
            if (!request.overwrite()) {
                context.log().warn("出力ディレクトリが既に存在するためスキップ: " + output);
                return false;
            }
            if (!request.dryRun()) {
                Path backup = FileSafety.backup(output);
                context.log().info("既存出力ディレクトリをバックアップしました: " + backup);
                FileSafety.deleteTree(output);
            }
        }
        return true;
    }

    private static Path outputFile(Path input, Path root, String prefix, String name) {
        return (root == null ? input.getParent() : root.toAbsolutePath().normalize()).resolve(prefix + name);
    }

    private static Path hlsDirectory(Path input, Path root) {
        return (root == null ? input.getParent() : root.toAbsolutePath().normalize()).resolve(stem(input) + ".HLS");
    }

    private static String overwriteFlag(CommandRequest request) {
        return request.overwrite() ? "-y" : "-n";
    }

    private static String stem(Path path) {
        String name = path.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    private static List<String> buildHlsCommand(Path input, Path output, MediaInfo info, boolean copy,
                                                CommandRequest request, String ffmpeg) {
        String duration = request.value("segment-duration", "6");
        String crf = request.value("crf", "20");
        String preset = request.value("preset", "veryfast");
        String audioBitrate = request.value("audio-bitrate", "192k");
        List<String> command = new ArrayList<>(List.of(ffmpeg, "-hide_banner", "-nostdin", overwriteFlag(request), "-i", input.toString(),
                "-map", "0:v:0"));
        if (copy) {
            command.addAll(List.of("-c:v", "copy"));
        } else {
            command.addAll(List.of("-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p"));
        }
        command.addAll(List.of("-f", "hls", "-hls_time", duration, "-movflags", "cmaf", "-hls_segment_type", "fmp4",
                "-hls_playlist_type", "vod", "-hls_flags", "independent_segments", "-start_number", "1",
                "-hls_fmp4_init_filename", "video/init01.cmfv", "-hls_segment_filename", "video/%03d.cmfv", "video.m3u8"));
        if (info.hasAudio()) {
            command.addAll(List.of("-map", "0:a:0?"));
            if (copy) {
                command.addAll(List.of("-c:a", "copy"));
            } else {
                command.addAll(List.of("-c:a", "aac", "-b:a", audioBitrate, "-ac", "2"));
            }
            command.addAll(List.of("-f", "hls", "-hls_time", duration, "-movflags", "cmaf", "-hls_segment_type", "fmp4",
                    "-hls_playlist_type", "vod", "-hls_flags", "independent_segments", "-start_number", "1",
                    "-hls_fmp4_init_filename", "audio/init01.cmfa", "-hls_segment_filename", "audio/%03d.cmfa", "audio.m3u8"));
        }
        return command;
    }

    private static String probe(Path input, String ffprobe, String stream) throws IOException, InterruptedException {
        ProcessBuilder builder = new ProcessBuilder(ffprobe, "-v", "error", "-select_streams", stream + ":0",
                "-show_entries", "stream=codec_name", "-of", "default=nw=1:nk=1", input.toString());
        Process process = builder.start();
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
        int exit = process.waitFor();
        return exit == 0 ? output.lines().findFirst().orElse("") : "";
    }

    private static MediaInfo probeInfo(Path input, String ffprobe) throws IOException, InterruptedException {
        List<String> command = List.of(ffprobe, "-v", "error", "-show_entries",
                "stream=codec_type,codec_name,width,height,bit_rate:format=format_name", "-of", "csv=p=0", input.toString());
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        int exit = process.waitFor();
        if (exit != 0) {
            throw new IOException("ffprobeに失敗しました: " + input);
        }
        String videoCodec = "";
        String audioCodec = "";
        int height = 0;
        int audioBitrate = 0;
        String format = "";
        for (String line : output.lines().toList()) {
            String[] parts = line.split(",", -1);
            if (parts.length >= 2 && parts[0].equals("format")) {
                format = parts[1];
            } else if (parts[0].equals("video")) {
                videoCodec = parts.length > 1 ? parts[1] : "";
                height = parseInt(parts, 3);
            } else if (parts[0].equals("audio")) {
                audioCodec = parts.length > 1 ? parts[1] : "";
                audioBitrate = parseInt(parts, 4);
            }
        }
        return new MediaInfo(videoCodec, audioCodec, !audioCodec.isBlank(), 5_000_000, audioBitrate, height, format);
    }

    private static int parseInt(String[] values, int index) {
        if (index >= values.length) {
            return 0;
        }
        try {
            return Integer.parseInt(values[index].trim());
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static void prefixPlaylist(Path playlist, String prefix) throws IOException {
        if (!Files.exists(playlist)) {
            return;
        }
        List<String> result = new ArrayList<>();
        for (String line : Files.readAllLines(playlist)) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty() && !trimmed.startsWith("#") && !trimmed.startsWith(prefix)) {
                result.add(prefix + trimmed);
            } else if (trimmed.startsWith("#EXT-X-MAP:") && trimmed.contains("URI=\"")) {
                result.add(line.replace("URI=\"", "URI=\"" + prefix));
            } else {
                result.add(line);
            }
        }
        Files.writeString(playlist, String.join(System.lineSeparator(), result) + System.lineSeparator());
    }

    private static void writeMasterPlaylist(Path output, MediaInfo info, boolean copy) throws IOException {
        String videoCodec = copy ? info.videoCodec() : "h264";
        String audioCodec = info.audioCodec().equals("aac") ? "mp4a.40.2" : info.audioCodec();
        String codecs = info.hasAudio() ? videoCodec + "," + (audioCodec.isBlank() ? "mp4a.40.2" : audioCodec) : videoCodec;
        StringBuilder content = new StringBuilder("#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-INDEPENDENT-SEGMENTS\n");
        if (info.hasAudio()) {
            content.append("#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"audio\",NAME=\"Default\",AUTOSELECT=YES,URI=\"audio.m3u8\"\n");
        }
        content.append("#EXT-X-STREAM-INF:BANDWIDTH=").append(info.bandwidth())
                .append(",CODECS=\"").append(codecs).append("\"");
        if (info.hasAudio()) {
            content.append(",AUDIO=\"audio\"");
        }
        content.append("\nvideo.m3u8\n");
        Files.writeString(output.resolve("master.m3u8"), content);
    }

    private static String fetchTitle(HttpClient client, String videoId, PluginContext context,
                                     String watchApiUrl, String legacyApiUrl) {
        try {
            String track = UUID.randomUUID().toString().replace("-", "") + "_" + System.currentTimeMillis();
            URI uri = URI.create(joinEndpoint(watchApiUrl, videoId) + "?actionTrackId=" + track);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(20))
                    .header("Accept", "application/json")
                    .header("User-Agent", "filter-matome-toolbox/0.1")
                    .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                context.log().warn("動画情報APIがHTTP " + response.statusCode() + "を返しました。旧APIへフォールバックします: " + videoId);
                return fetchLegacyTitle(client, videoId, legacyApiUrl);
            }
            Map<String, Object> root = Json.object(Json.parse(response.body()));
            Map<String, Object> data = Json.object(root.get("data"));
            Map<String, Object> video = Json.object(data.get("video"));
            if (Json.bool(video.get("isDeleted"), false) || Json.bool(video.get("isPrivate"), false)) {
                return null;
            }
            return Json.string(video.get("title"), null);
        } catch (Exception exception) {
            context.log().warn("動画情報APIに失敗したため旧APIへフォールバックします: " + videoId + " (" + exception.getMessage() + ")");
            return fetchLegacyTitle(client, videoId, legacyApiUrl);
        }
    }

    private static String fetchLegacyTitle(HttpClient client, String videoId, String legacyApiUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(joinEndpoint(legacyApiUrl, videoId)))
                    .timeout(Duration.ofSeconds(20))
                    .header("User-Agent", "filter-matome-toolbox/0.1")
                    .GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) return null;
            Matcher matcher = Pattern.compile("<title>(.*?)</title>", Pattern.DOTALL).matcher(response.body());
            if (!matcher.find()) return null;
            return matcher.group(1).replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                    .replace("&quot;", "\"").replace("&#39;", "'").trim();
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String joinEndpoint(String base, String suffix) {
        String normalized = base == null ? "" : base.trim();
        if (normalized.endsWith("/")) {
            return normalized + suffix;
        }
        return normalized + "/" + suffix;
    }

    private record MediaInfo(String videoCodec, String audioCodec, boolean hasAudio, int bandwidth,
                             int audioBitrate, int height, String formatName) {
        private MediaInfo(String videoCodec, String audioCodec, boolean hasAudio, int bandwidth, int audioBitrate) {
            this(videoCodec, audioCodec, hasAudio, bandwidth, audioBitrate, 0, "mp4");
        }
    }

    private static final class MediaPanel extends JPanel {
        private final MediaPlugin plugin;
        private final PluginContext context;
        private final JTextArea inputs = new JTextArea(5, 50);
        private final JTextField output = new JTextField();
        private final JComboBox<String> action = new JComboBox<>(new String[]{"cut10", "cut60", "faststart", "hls", "convert", "rename"});
        private final JComboBox<String> mode = new JComboBox<>(new String[]{"h264", "hevc", "av1", "adaptive"});
        private final JTextField segment = new JTextField("6", 5);
        private final JTextField crf = new JTextField("20", 5);
        private final JTextField preset = new JTextField("veryfast", 8);
        private final JTextField audioBitrate = new JTextField("192k", 6);
        private final JCheckBox recursive = new JCheckBox("サブフォルダを再帰探索");
        private final JCheckBox overwrite = new JCheckBox("既存出力を上書き（バックアップ作成）");
        private final JCheckBox dryRun = new JCheckBox("ドライラン");
        private final JButton start = new JButton("開始");
        private final JButton cancel = new JButton("キャンセル");
        private CancellationToken token;
        private SwingWorker<Integer, Void> worker;

        private MediaPanel(MediaPlugin plugin, PluginContext context) {
            super(new BorderLayout(8, 8));
            this.plugin = plugin;
            this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            build();
        }

        private void build() {
            inputs.setLineWrap(true);
            inputs.setWrapStyleWord(true);
            inputs.setToolTipText("1行1パス。ファイルやフォルダをドロップできます。");
            inputs.setTransferHandler(new TransferHandler() {
                @Override
                public boolean canImport(TransferSupport support) {
                    return support.isDataFlavorSupported(DataFlavor.javaFileListFlavor);
                }

                @Override
                public boolean importData(TransferSupport support) {
                    try {
                        @SuppressWarnings("unchecked")
                        List<java.io.File> files = (List<java.io.File>) support.getTransferable().getTransferData(DataFlavor.javaFileListFlavor);
                        for (java.io.File file : files) {
                            if (inputs.getText().isBlank() || !inputs.getText().endsWith("\n")) {
                                inputs.append(inputs.getText().isBlank() ? "" : "\n");
                            }
                            inputs.append(file.toPath().toString());
                        }
                        return true;
                    } catch (Exception exception) {
                        context.log().error("ドロップされたパスを読み込めません: " + exception.getMessage());
                        return false;
                    }
                }
            });
            JPanel inputPanel = new JPanel(new BorderLayout(5, 5));
            inputPanel.setBorder(BorderFactory.createTitledBorder("入力（1行1パス）"));
            inputPanel.add(new JScrollPane(inputs), BorderLayout.CENTER);
            JButton choose = new JButton("追加");
            choose.addActionListener(event -> chooseInputs());
            inputPanel.add(choose, BorderLayout.SOUTH);

            JPanel options = new JPanel(new GridBagLayout());
            options.setBorder(BorderFactory.createTitledBorder("処理設定"));
            GridBagConstraints c = new GridBagConstraints();
            c.insets = new Insets(3, 3, 3, 3);
            c.anchor = GridBagConstraints.WEST;
            c.fill = GridBagConstraints.HORIZONTAL;
            addRow(options, c, 0, "アクション", action);
            addRow(options, c, 1, "変換モード", mode);
            addRow(options, c, 2, "出力フォルダ", output);
            addRow(options, c, 3, "セグメント秒", segment);
            addRow(options, c, 4, "CRF", crf);
            addRow(options, c, 5, "プリセット", preset);
            addRow(options, c, 6, "音声ビットレート", audioBitrate);
            c.gridx = 1; c.gridy = 7; options.add(recursive, c);
            c.gridy = 8; options.add(overwrite, c);
            c.gridy = 9; options.add(dryRun, c);
            JButton outputChoose = new JButton("参照");
            outputChoose.addActionListener(event -> chooseOutput());
            c.gridx = 2; c.gridy = 2; options.add(outputChoose, c);
            start.addActionListener(event -> start());
            cancel.setEnabled(false);
            cancel.addActionListener(event -> cancel());
            JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT));
            buttons.add(start); buttons.add(cancel);

            JPanel top = new JPanel(new BorderLayout(8, 8));
            top.add(inputPanel, BorderLayout.CENTER);
            top.add(options, BorderLayout.EAST);
            add(top, BorderLayout.CENTER);
            add(buttons, BorderLayout.SOUTH);
        }

        private static void addRow(JPanel panel, GridBagConstraints c, int row, String label, java.awt.Component component) {
            c.gridx = 0; c.gridy = row; panel.add(new JLabel(label), c);
            c.gridx = 1; c.weightx = 1; panel.add(component, c); c.weightx = 0;
        }

        private void chooseInputs() {
            JFileChooser chooser = new JFileChooser();
            chooser.setMultiSelectionEnabled(true);
            chooser.setFileSelectionMode(JFileChooser.FILES_AND_DIRECTORIES);
            if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                for (java.io.File file : chooser.getSelectedFiles()) {
                    if (!inputs.getText().isBlank()) inputs.append("\n");
                    inputs.append(file.toPath().toString());
                }
            }
        }

        private void chooseOutput() {
            JFileChooser chooser = new JFileChooser();
            chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
            if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                output.setText(chooser.getSelectedFile().toPath().toString());
            }
        }

        private void start() {
            List<String> paths = inputs.getText().lines().map(String::trim).filter(s -> !s.isBlank()).toList();
            if (paths.isEmpty()) {
                JOptionPane.showMessageDialog(this, "入力を指定してください。", "入力エラー", JOptionPane.ERROR_MESSAGE);
                return;
            }
            boolean needsConfirmation = overwrite.isSelected() || action.getSelectedItem().toString().equals("rename");
            if (needsConfirmation && !dryRun.isSelected()) {
                int answer = JOptionPane.showConfirmDialog(this, "既存ファイルをバックアップして処理します。続行しますか？",
                        "確認", JOptionPane.YES_NO_OPTION);
                if (answer != JOptionPane.YES_OPTION) return;
            }
            Map<String, String> values = new HashMap<>();
            values.put("mode", mode.getSelectedItem().toString());
            values.put("segment-duration", segment.getText().trim());
            values.put("crf", crf.getText().trim());
            values.put("preset", preset.getText().trim());
            values.put("audio-bitrate", audioBitrate.getText().trim());
            CommandRequest request = new CommandRequest(action.getSelectedItem().toString(), paths, values,
                    recursive.isSelected(), overwrite.isSelected(), dryRun.isSelected(), true,
                    output.getText().isBlank() ? null : Path.of(output.getText().trim()));
            token = new CancellationToken();
            start.setEnabled(false); cancel.setEnabled(true);
            worker = new SwingWorker<>() {
                @Override protected Integer doInBackground() throws Exception {
                    return plugin.execute(request, context, token);
                }

                @Override protected void done() {
                    start.setEnabled(true); cancel.setEnabled(false);
                    try {
                        context.log().info("メディア処理終了: exit=" + get());
                    } catch (Exception exception) {
                        context.log().error("メディア処理に失敗しました: " + exception.getMessage());
                    }
                }
            };
            worker.execute();
        }

        private void cancel() {
            if (token != null) token.cancel();
        }
    }
}
