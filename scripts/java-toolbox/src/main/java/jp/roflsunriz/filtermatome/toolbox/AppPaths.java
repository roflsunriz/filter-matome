package jp.roflsunriz.filtermatome.toolbox;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;

/** 固定された C:\ ドライブに依存しないアプリケーションパス。 */
public record AppPaths(
        Path dataDir,
        Path configFile,
        Path pluginsDir,
        Path logsDir,
        Path repoRoot) {

    public static AppPaths discover(CliOptions options) throws IOException {
        Path current = Path.of("").toAbsolutePath().normalize();
        Path data = options.dataDir() != null
                ? options.dataDir().toAbsolutePath().normalize()
                : Path.of(System.getProperty("user.home"), ".filter-matome-toolbox").toAbsolutePath().normalize();
        Path repo = options.repoRoot() != null
                ? options.repoRoot().toAbsolutePath().normalize()
                : findRepositoryRoot(current);
        Path plugins = options.pluginsDir() != null
                ? options.pluginsDir().toAbsolutePath().normalize()
                : data.resolve("plugins");
        Files.createDirectories(data);
        Files.createDirectories(plugins);
        Files.createDirectories(data.resolve("logs"));
        return new AppPaths(data, data.resolve("app.properties"), plugins, data.resolve("logs"), repo);
    }

    private static Path findRepositoryRoot(Path start) {
        Path candidate = start;
        while (candidate != null) {
            if (Files.isDirectory(candidate.resolve("scripts"))
                    && (Files.exists(candidate.resolve("README.md")) || Files.exists(candidate.resolve("AGENTS.md")))) {
                return candidate;
            }
            candidate = candidate.getParent();
        }
        return start;
    }

    public Path resolveRepo(String relative) {
        Objects.requireNonNull(relative, "relative");
        return repoRoot.resolve(relative).normalize();
    }
}
