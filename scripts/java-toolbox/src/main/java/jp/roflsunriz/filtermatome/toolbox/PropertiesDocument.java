package jp.roflsunriz.filtermatome.toolbox;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CodingErrorAction;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** コメントと並び順を維持した properties 編集用ドキュメント。 */
public final class PropertiesDocument {
    public record Setting(String key, String value, String comment, String source) {
    }

    private static final String MARKER = "# NicoCache_nl 設定ファイル(文字コード判定用なのでこの行は削除しないこと)";
    private final Path path;
    private final Charset charset;
    private final List<String> lines;
    private final LinkedHashMap<String, Integer> indexes = new LinkedHashMap<>();
    private final LinkedHashMap<String, String> values = new LinkedHashMap<>();
    private final LinkedHashMap<String, String> comments = new LinkedHashMap<>();

    private PropertiesDocument(Path path, Charset charset, List<String> lines) {
        this.path = path.toAbsolutePath().normalize();
        this.charset = charset;
        this.lines = lines;
        reindex();
    }

    public static PropertiesDocument load(Path path) throws IOException {
        Path normalized = path.toAbsolutePath().normalize();
        if (!Files.exists(normalized)) {
            return new PropertiesDocument(normalized, StandardCharsetsHolder.UTF8, new ArrayList<>());
        }
        byte[] bytes = Files.readAllBytes(normalized);
        DetectedText detected = decode(bytes);
        String text = detected.text().replace("\r\n", "\n").replace('\r', '\n');
        List<String> lines = new ArrayList<>(List.of(text.split("\n", -1)));
        if (!lines.isEmpty() && lines.get(lines.size() - 1).isEmpty()) {
            lines.remove(lines.size() - 1);
        }
        return new PropertiesDocument(normalized, detected.charset(), lines);
    }

    public static Map<String, Setting> loadDefaults(Path defaultsDir) throws IOException {
        if (!Files.isDirectory(defaultsDir)) {
            return Map.of();
        }
        LinkedHashMap<String, Setting> result = new LinkedHashMap<>();
        try (var files = Files.list(defaultsDir)) {
            for (Path file : files.filter(item -> item.getFileName().toString().endsWith(".properties")).sorted().toList()) {
                PropertiesDocument document = load(file);
                for (String key : document.keys()) {
                    result.putIfAbsent(key, new Setting(key, document.value(key), document.comment(key), file.getFileName().toString()));
                }
            }
        }
        return result;
    }

    public Path path() {
        return path;
    }

    public Charset charset() {
        return charset;
    }

    public List<String> keys() {
        return List.copyOf(values.keySet());
    }

    public Map<String, String> values() {
        return Collections.unmodifiableMap(values);
    }

    public String value(String key) {
        return values.get(key);
    }

    public String comment(String key) {
        return comments.getOrDefault(key, "");
    }

    public void set(String key, String value, String comment) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("設定キーが空です。");
        }
        String normalizedKey = key.trim();
        String normalizedValue = value == null ? "" : value;
        Integer index = indexes.get(normalizedKey);
        if (index == null) {
            if (comment != null && !comment.isBlank()) {
                if (!lines.isEmpty() && !lines.get(lines.size() - 1).isBlank()) {
                    lines.add("");
                }
                for (String commentLine : comment.replace("\r", "").split("\n")) {
                    String trimmed = commentLine.trim();
                    if (!trimmed.isEmpty() && !trimmed.startsWith("#") && !trimmed.startsWith(";")) {
                        trimmed = "# " + trimmed;
                    }
                    lines.add(trimmed);
                }
            }
            lines.add(normalizedKey + "=" + normalizedValue);
        } else {
            String original = lines.get(index);
            int separator = firstSeparator(original);
            String prefix = separator >= 0 ? original.substring(0, separator + 1) : normalizedKey + "=";
            String leading = prefix.substring(0, Math.max(0, prefix.length() - 1));
            lines.set(index, leading + "=" + normalizedValue);
        }
        reindex();
    }

    public void remove(String key) {
        Integer index = indexes.get(key);
        if (index != null) {
            lines.remove((int) index);
            reindex();
        }
    }

    public Path save() throws IOException {
        if (!containsMarker()) {
            lines.add(0, MARKER);
            lines.add(1, "");
        }
        Files.createDirectories(path.getParent());
        Path backup = FileSafety.backup(path);
        Path temp = path.resolveSibling(path.getFileName() + ".tmp");
        String text = String.join(System.lineSeparator(), lines) + System.lineSeparator();
        Files.writeString(temp, text, charset);
        try {
            Files.move(temp, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(temp, path, StandardCopyOption.REPLACE_EXISTING);
        }
        return backup;
    }

    private boolean containsMarker() {
        return lines.stream().anyMatch(line -> line.contains(MARKER));
    }

    private void reindex() {
        indexes.clear();
        values.clear();
        comments.clear();
        List<String> pendingComments = new ArrayList<>();
        for (int i = 0; i < lines.size(); i++) {
            String line = lines.get(i);
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                pendingComments.clear();
                continue;
            }
            if (trimmed.startsWith("#") || trimmed.startsWith(";")) {
                if (!trimmed.contains(MARKER)) {
                    pendingComments.add(line);
                }
                continue;
            }
            int separator = firstSeparator(line);
            if (separator < 0) {
                pendingComments.clear();
                continue;
            }
            String key = line.substring(0, separator).trim();
            if (key.isEmpty() || indexes.containsKey(key)) {
                pendingComments.clear();
                continue;
            }
            String value = line.substring(separator + 1).trim();
            indexes.put(key, i);
            values.put(key, value);
            comments.put(key, String.join("\n", pendingComments));
            pendingComments.clear();
        }
    }

    private static int firstSeparator(String line) {
        int equal = line.indexOf('=');
        int colon = line.indexOf(':');
        if (equal < 0) {
            return colon;
        }
        if (colon < 0) {
            return equal;
        }
        return Math.min(equal, colon);
    }

    private record DetectedText(Charset charset, String text) {
    }

    private static DetectedText decode(byte[] bytes) throws IOException {
        List<Charset> candidates = List.of(
                StandardCharsetsHolder.UTF8,
                Charset.forName("Windows-31J"),
                Charset.forName("EUC-JP"));
        for (Charset candidate : candidates) {
            try {
                var decoder = candidate.newDecoder()
                        .onMalformedInput(CodingErrorAction.REPORT)
                        .onUnmappableCharacter(CodingErrorAction.REPORT);
                CharBuffer decoded = decoder.decode(ByteBuffer.wrap(bytes));
                return new DetectedText(candidate, decoded.toString().replaceFirst("^\\uFEFF", ""));
            } catch (CharacterCodingException ignored) {
                // 次の候補を試す。
            }
        }
        return new DetectedText(StandardCharsetsHolder.UTF8, new String(bytes, StandardCharsetsHolder.UTF8));
    }

    private static final class StandardCharsetsHolder {
        private static final Charset UTF8 = java.nio.charset.StandardCharsets.UTF_8;
    }
}
