package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.Json;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.ProcessResult;

import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** ffprobeとGPACを使い、メディア命名・変換に必要な実測値を正規化する。 */
final class MediaInspector {
    private static final Pattern GPAC_PID_ELEMENT = Pattern.compile(
            "(?s)<PIDConfigure\\b[^>]*/>");
    private static final Pattern GPAC_SUMMARY_BITRATE = Pattern.compile(
            "(?m)^\\s*Bitrate:\\s*avg\\s+([\\d.]+)\\s+max\\s+([\\d.]+)\\s+(kbps|Mbps)");

    private MediaInspector() {
    }

    static MediaInfo inspectForRename(Path input, String requestedInspector,
                                      String ffprobe, String gpac,
                                      PluginContext context)
            throws IOException, InterruptedException {
        String inspector = requestedInspector == null
                ? "auto" : requestedInspector.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("auto", "ffprobe", "gpac").contains(inspector)) {
            throw new IllegalArgumentException(
                    "inspectorはauto、ffprobe、gpacのいずれかを指定してください: "
                            + requestedInspector);
        }

        List<String> errors = new ArrayList<>();
        MediaInfo combined = null;
        if (!inspector.equals("gpac")) {
            if (toolAvailable(ffprobe, List.of("-version"), context)) {
                try {
                    MediaInfo info = probeWithFfprobe(input, ffprobe);
                    combined = merge(combined, info);
                    if (renameInfoComplete(combined)) {
                        context.log().info("メディア解析: ffprobe / " + input.getFileName());
                        return combined;
                    }
                    errors.add("ffprobeの解析結果に解像度または音声ビットレートがありません");
                } catch (IOException exception) {
                    errors.add("ffprobe: " + exception.getMessage());
                }
            } else {
                errors.add("ffprobeを実行できません: " + ffprobe);
            }
            if (inspector.equals("ffprobe")) {
                throw new IOException(String.join(" / ", errors));
            }
            context.log().warn(errors.get(errors.size() - 1)
                    + "。GPACへフォールバックします。");
        }

        if (toolAvailable(gpac, List.of("-p=0", "-h"), context)) {
            try {
                MediaInfo info = probeWithGpac(input, gpac, context);
                combined = merge(combined, info);
                if (renameInfoComplete(combined)) {
                    context.log().info("メディア解析: GPAC / " + input.getFileName());
                    return combined;
                }
                errors.add("GPACの解析結果に解像度または音声ビットレートがありません");
            } catch (IOException exception) {
                errors.add("GPAC: " + exception.getMessage());
            }
        } else {
            errors.add("GPACを実行できません: " + gpac);
        }
        throw new IOException(String.join(" / ", errors));
    }

    static MediaInfo probeWithFfprobe(Path input, String ffprobe)
            throws IOException, InterruptedException {
        List<String> command = List.of(ffprobe, "-v", "error", "-show_entries",
                "stream=codec_type,codec_name,profile,pix_fmt,width,height,bit_rate:format=format_name",
                "-of", "json", input.toString());
        Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
        String output = new String(process.getInputStream().readAllBytes(),
                StandardCharsets.UTF_8);
        int exit = process.waitFor();
        if (exit != 0) {
            throw new IOException("ffprobeに失敗しました: " + input);
        }
        try {
            Map<String, Object> root = Json.object(Json.parse(output));
            String videoCodec = "";
            String videoProfile = "";
            String pixelFormat = "";
            String audioCodec = "";
            int height = 0;
            int audioBitrate = 0;
            boolean hasAudio = false;
            for (Object value : Json.array(root.get("streams"))) {
                Map<String, Object> stream = Json.object(value);
                String type = Json.string(stream.get("codec_type"), "");
                if (type.equals("video")) {
                    if (videoCodec.isBlank()) {
                        videoCodec = Json.string(stream.get("codec_name"), "");
                        videoProfile = Json.string(stream.get("profile"), "");
                        pixelFormat = Json.string(stream.get("pix_fmt"), "");
                    }
                    height = Math.max(height, parsePositiveInt(stream.get("height")));
                } else if (type.equals("audio")) {
                    hasAudio = true;
                    if (audioCodec.isBlank()) {
                        audioCodec = Json.string(stream.get("codec_name"), "");
                    }
                    audioBitrate = Math.max(audioBitrate,
                            parsePositiveInt(stream.get("bit_rate")));
                }
            }
            Map<String, Object> format = Json.object(root.get("format"));
            return new MediaInfo(videoCodec, audioCodec, hasAudio, 5_000_000,
                    audioBitrate, height, Json.string(format.get("format_name"), ""),
                    videoProfile, pixelFormat);
        } catch (IllegalArgumentException exception) {
            throw new IOException("ffprobeのJSONを解析できません: " + input, exception);
        }
    }

    static String resolveGpacExecutable(PluginContext context) {
        String configured = context.config().get("tools.gpac", "").trim();
        if (!configured.isEmpty()) {
            return configured;
        }
        String environment = System.getenv("GPAC_PATH");
        if (environment != null && !environment.isBlank()) {
            Path path = Path.of(environment.trim());
            if (Files.isDirectory(path)) {
                path = path.resolve(isWindows() ? "gpac.exe" : "gpac");
            }
            if (Files.isRegularFile(path)) {
                return path.toString();
            }
        }
        if (isWindows()) {
            List<Path> candidates = List.of(
                    Path.of("C:/PathArea/GPAC/gpac.exe"),
                    Path.of("C:/PathArea/gpac/gpac.exe"),
                    Path.of(System.getenv().getOrDefault("LOCALAPPDATA", "C:/"),
                            "Programs", "GPAC", "gpac.exe"),
                    Path.of(System.getenv().getOrDefault(
                                    "ProgramFiles", "C:/Program Files"),
                            "GPAC", "gpac.exe"));
            for (Path candidate : candidates) {
                if (Files.isRegularFile(candidate)) {
                    return candidate.toString();
                }
            }
        }
        return "gpac";
    }

    private static boolean toolAvailable(String executable, List<String> arguments,
                                         PluginContext context) throws InterruptedException {
        List<String> command = new ArrayList<>();
        command.add(executable);
        command.addAll(arguments);
        try {
            return context.processes().capture(command, null).succeeded();
        } catch (IOException exception) {
            return false;
        }
    }

    private static MediaInfo probeWithGpac(Path input, String gpac,
                                           PluginContext context)
            throws IOException, InterruptedException {
        List<String> command = List.of(gpac, "-p=0", "-se", "-i",
                input.toAbsolutePath().normalize().toString(),
                "inspect:xml:stats:allp");
        ProcessResult result = context.processes().capture(command, input.getParent());
        if (!result.succeeded()) {
            throw new IOException("GPAC inspectに失敗しました (exit="
                    + result.exitCode() + ")");
        }
        return parseGpacInfo(result.output());
    }

    private static MediaInfo parseGpacInfo(String output) throws IOException {
        int rootStart = output.indexOf("<GPACInspect");
        int rootEnd = rootStart < 0 ? -1
                : output.indexOf("</GPACInspect>", rootStart);
        if (rootStart < 0 || rootEnd < 0) {
            throw new IOException("GPAC inspectのXMLが見つかりません");
        }
        rootEnd += "</GPACInspect>".length();
        String xml = output.substring(rootStart, rootEnd);
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(
                    "http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature(
                    "http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature(
                    "http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature(
                    "http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);

            NodeList nodes = factory.newDocumentBuilder()
                    .parse(new InputSource(new StringReader(xml)))
                    .getElementsByTagName("PIDConfigure");
            List<String> summaries = extractGpacSummaries(xml);
            String videoCodec = "";
            String audioCodec = "";
            int height = 0;
            int audioBitrate = 0;
            boolean hasAudio = false;
            for (int index = 0; index < nodes.getLength(); index++) {
                if (!(nodes.item(index) instanceof Element element)) {
                    continue;
                }
                String type = attribute(element, "StreamType")
                        .toLowerCase(Locale.ROOT);
                String summary = index < summaries.size() ? summaries.get(index) : "";
                if (type.equals("visual") || type.equals("video")) {
                    videoCodec = firstNonBlank(videoCodec,
                            attribute(element, "CodecID", "Codec"));
                    height = Math.max(height, parsePositiveInt(firstNonBlank(
                            attribute(element, "ServiceHeight"),
                            attribute(element, "Height"))));
                } else if (type.equals("audio")) {
                    hasAudio = true;
                    audioCodec = firstNonBlank(audioCodec,
                            attribute(element, "CodecID", "Codec"));
                    int bitrate = parsePositiveInt(attribute(element,
                            "Bitrate", "BitRate", "AvgBitrate", "Maxrate"));
                    if (bitrate == 0) {
                        bitrate = parseGpacSummaryBitrate(summary);
                    }
                    audioBitrate = Math.max(audioBitrate, bitrate);
                }
            }
            if (nodes.getLength() == 0) {
                throw new IOException("GPAC inspectにPID情報がありません");
            }
            return new MediaInfo(videoCodec, audioCodec, hasAudio, 5_000_000,
                    audioBitrate, height, "mp4");
        } catch (IOException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IOException("GPAC inspectのXMLを解析できません", exception);
        }
    }

    private static List<String> extractGpacSummaries(String xml) {
        List<Integer> starts = new ArrayList<>();
        List<Integer> ends = new ArrayList<>();
        Matcher matcher = GPAC_PID_ELEMENT.matcher(xml);
        while (matcher.find()) {
            starts.add(matcher.start());
            ends.add(matcher.end());
        }
        List<String> summaries = new ArrayList<>();
        for (int index = 0; index < ends.size(); index++) {
            int next = index + 1 < starts.size() ? starts.get(index + 1)
                    : xml.indexOf("</GPACInspect>", ends.get(index));
            summaries.add(xml.substring(
                    ends.get(index), next < 0 ? xml.length() : next));
        }
        return summaries;
    }

    private static int parseGpacSummaryBitrate(String summary) {
        Matcher matcher = GPAC_SUMMARY_BITRATE.matcher(summary);
        if (!matcher.find()) {
            return 0;
        }
        try {
            double multiplier = matcher.group(3).equalsIgnoreCase("Mbps")
                    ? 1_000_000.0 : 1_000.0;
            double bitrate = Double.parseDouble(matcher.group(1)) * multiplier;
            return bitrate > 0 && bitrate <= Integer.MAX_VALUE
                    ? (int) Math.round(bitrate) : 0;
        } catch (NumberFormatException exception) {
            return 0;
        }
    }

    private static String attribute(Element element, String... names) {
        for (String name : names) {
            String value = element.getAttribute(name);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "";
    }

    private static MediaInfo merge(MediaInfo primary, MediaInfo fallback) {
        if (primary == null) {
            return fallback;
        }
        if (fallback == null) {
            return primary;
        }
        return new MediaInfo(
                firstNonBlank(primary.videoCodec(), fallback.videoCodec()),
                firstNonBlank(primary.audioCodec(), fallback.audioCodec()),
                primary.hasAudio() || fallback.hasAudio(),
                primary.bandwidth() > 0 ? primary.bandwidth() : fallback.bandwidth(),
                primary.audioBitrate() > 0
                        ? primary.audioBitrate() : fallback.audioBitrate(),
                primary.height() > 0 ? primary.height() : fallback.height(),
                firstNonBlank(primary.formatName(), fallback.formatName()),
                firstNonBlank(primary.videoProfile(), fallback.videoProfile()),
                firstNonBlank(primary.pixelFormat(), fallback.pixelFormat()));
    }

    static boolean isFirefoxCompatibleH264(MediaInfo info) {
        if (info == null || !info.videoCodec().equalsIgnoreCase("h264")) {
            return false;
        }
        String pixelFormat = info.pixelFormat().toLowerCase(Locale.ROOT);
        if (!pixelFormat.equals("yuv420p") && !pixelFormat.equals("yuvj420p")) {
            return false;
        }
        String profile = info.videoProfile().toLowerCase(Locale.ROOT);
        return profile.equals("constrained baseline")
                || profile.equals("baseline")
                || profile.equals("main")
                || profile.equals("high")
                || profile.equals("progressive high");
    }

    private static boolean renameInfoComplete(MediaInfo info) {
        return info != null && info.height() > 0
                && (!info.hasAudio() || info.audioBitrate() > 0);
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private static int parsePositiveInt(Object value) {
        String text = Json.numberText(
                value, value instanceof String ? (String) value : "");
        if (text == null || text.isBlank()) {
            return 0;
        }
        try {
            double number = Double.parseDouble(text.trim());
            return number > 0 && number <= Integer.MAX_VALUE
                    ? (int) Math.round(number) : 0;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "")
                .toLowerCase(Locale.ROOT).contains("win");
    }

    record MediaInfo(String videoCodec, String audioCodec, boolean hasAudio,
                     int bandwidth, int audioBitrate, int height,
                     String formatName, String videoProfile,
                     String pixelFormat) {
        MediaInfo(String videoCodec, String audioCodec, boolean hasAudio,
                  int bandwidth, int audioBitrate, int height,
                  String formatName) {
            this(videoCodec, audioCodec, hasAudio, bandwidth,
                    audioBitrate, height, formatName, "", "");
        }

        MediaInfo(String videoCodec, String audioCodec, boolean hasAudio,
                  int bandwidth, int audioBitrate) {
            this(videoCodec, audioCodec, hasAudio, bandwidth,
                    audioBitrate, 0, "mp4", "", "");
        }
    }
}
