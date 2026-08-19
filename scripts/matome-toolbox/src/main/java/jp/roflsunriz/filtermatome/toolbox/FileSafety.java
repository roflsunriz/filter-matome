package jp.roflsunriz.filtermatome.toolbox;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public final class FileSafety {
    private static final Pattern INVALID_NAME = Pattern.compile("[\\\\/:*?\"<>|\\p{Cntrl}]");
    private FileSafety() {
    }

    public static List<Path> collect(List<String> inputs, Set<String> extensions, boolean recursive) throws IOException {
        List<Path> result = new ArrayList<>();
        for (String raw : inputs) {
            Path path = Path.of(raw).toAbsolutePath().normalize();
            if (Files.isRegularFile(path)) {
                if (extensions.isEmpty() || extensions.contains(extension(path))) {
                    result.add(path);
                }
            } else if (Files.isDirectory(path)) {
                try (var stream = recursive ? Files.walk(path) : Files.list(path)) {
                    stream.filter(Files::isRegularFile)
                            .filter(candidate -> extensions.isEmpty() || extensions.contains(extension(candidate)))
                            .forEach(result::add);
                }
            } else {
                throw new IOException("入力パスが存在しません: " + raw);
            }
        }
        return result.stream().map(Path::toAbsolutePath).map(Path::normalize).distinct()
                .sorted(Comparator.comparing(Path::toString)).toList();
    }

    public static String extension(Path path) {
        String name = path.getFileName().toString().toLowerCase();
        int dot = name.lastIndexOf('.');
        return dot >= 0 ? name.substring(dot) : "";
    }

    public static void ensureDifferent(Path input, Path output) throws IOException {
        if (input.toAbsolutePath().normalize().equals(output.toAbsolutePath().normalize())) {
            throw new IOException("入力ファイルと出力ファイルを同じにできません: " + input);
        }
    }

    public static Path backup(Path original) throws IOException {
        if (!Files.exists(original)) {
            return null;
        }
        Path backup = original.resolveSibling(original.getFileName() + ".bak-" + Instant.now().toEpochMilli());
        if (Files.isDirectory(original) && !Files.isSymbolicLink(original)) {
            copyTree(original, backup);
        } else {
            Files.copy(original, backup, StandardCopyOption.COPY_ATTRIBUTES);
        }
        return backup;
    }

    public static void deleteTree(Path target) throws IOException {
        Path normalized = target.toAbsolutePath().normalize();
        if (normalized.getParent() == null || normalized.getFileName() == null) {
            throw new IOException("安全のため削除できないパスです: " + normalized);
        }
        if (!Files.exists(normalized)) {
            return;
        }
        Files.walkFileTree(normalized, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                if (exc != null) {
                    throw exc;
                }
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    public static String safeFileName(String value) {
        if (value == null) {
            return "untitled";
        }
        String normalized = INVALID_NAME.matcher(value).replaceAll("_").replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return "untitled";
        }
        return normalized.length() > 180 ? normalized.substring(0, 180).trim() : normalized;
    }

    private static void copyTree(Path source, Path target) throws IOException {
        Files.walkFileTree(source, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) throws IOException {
                Files.createDirectories(target.resolve(source.relativize(dir)));
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.copy(file, target.resolve(source.relativize(file)), StandardCopyOption.COPY_ATTRIBUTES);
                return FileVisitResult.CONTINUE;
            }
        });
    }
}
