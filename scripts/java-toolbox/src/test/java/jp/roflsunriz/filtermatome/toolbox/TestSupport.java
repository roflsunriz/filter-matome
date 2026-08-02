package jp.roflsunriz.filtermatome.toolbox;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** テストからアプリケーションの実行境界を組み立てる共通ヘルパー。 */
public final class TestSupport {
    private TestSupport() {
    }

    public static PluginContext context(Path dataDir, Path repoRoot) throws IOException {
        Path normalizedData = dataDir.toAbsolutePath().normalize();
        Path normalizedRepo = repoRoot.toAbsolutePath().normalize();
        Path plugins = normalizedData.resolve("plugins");
        Path logs = normalizedData.resolve("logs");
        Files.createDirectories(plugins);
        Files.createDirectories(logs);
        AppPaths paths = new AppPaths(normalizedData, normalizedData.resolve("app.properties"), plugins, logs,
                normalizedRepo);
        return new PluginContext(paths, new AppConfig(paths.configFile()), new ProcessRunner(), new LogBus());
    }

    public static List<String> captureLogs(LogBus log) {
        List<String> lines = new ArrayList<>();
        Consumer<String> listener = lines::add;
        log.addListener(listener);
        return lines;
    }

    public static CommandRequest request(String action, List<String> inputs, Map<String, String> values,
                                         boolean recursive, boolean overwrite, boolean dryRun,
                                         boolean confirmed, Path output) {
        return new CommandRequest(action, List.copyOf(inputs), Map.copyOf(values), recursive, overwrite, dryRun,
                confirmed, output);
    }

    public static List<String> javaCommand(String... arguments) {
        List<String> command = new ArrayList<>();
        command.add(javaExecutable().toString());
        command.add("-cp");
        command.add(System.getProperty("java.class.path"));
        command.add(ProcessFixture.class.getName());
        command.addAll(List.of(arguments));
        return command;
    }

    public static Path javaExecutable() {
        String executable = System.getProperty("os.name", "").toLowerCase().contains("win") ? "java.exe" : "java";
        return Path.of(System.getProperty("java.home"), "bin", executable);
    }

    public static ProcessResult runMain(List<String> arguments, Path workingDirectory)
            throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add(javaExecutable().toString());
        command.add("-cp");
        command.add(System.getProperty("java.class.path"));
        command.add(Main.class.getName());
        command.addAll(arguments);
        Process process = new ProcessBuilder(command)
                .directory(workingDirectory.toFile())
                .redirectErrorStream(true)
                .start();
        String output;
        try (var stream = process.getInputStream()) {
            output = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
        if (!process.waitFor(30, TimeUnit.SECONDS)) {
            process.destroyForcibly();
            throw new IOException("テスト用JavaToolboxプロセスがタイムアウトしました。");
        }
        return new ProcessResult(process.exitValue(), output);
    }
}
