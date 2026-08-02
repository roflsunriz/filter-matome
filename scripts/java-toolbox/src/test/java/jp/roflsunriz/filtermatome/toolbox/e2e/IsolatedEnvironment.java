package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** 実ユーザーデータから切り離したJavaToolbox E2E実行環境。 */
public final class IsolatedEnvironment {
    private static final String TOOL_LOG_ENV = "FILTER_MATOME_FAKE_TOOL_LOG";

    private final Path root;
    private final Path data;
    private final Path repo;
    private final Path app;
    private final Path home;
    private final Path bin;
    private final Path toolLog;
    private final Map<String, Path> tools = new HashMap<>();

    public IsolatedEnvironment(Path parent) throws IOException {
        root = Files.createDirectories(parent.resolve("java-toolbox-isolated").toAbsolutePath().normalize());
        data = Files.createDirectories(root.resolve("data"));
        repo = Files.createDirectories(root.resolve("repo"));
        app = Files.createDirectories(root.resolve("app"));
        home = Files.createDirectories(root.resolve("home"));
        bin = Files.createDirectories(root.resolve("bin"));
        toolLog = root.resolve("fake-tools.log");
    }

    public Path root() {
        return root;
    }

    public Path data() {
        return data;
    }

    public Path repo() {
        return repo;
    }

    public Path app() {
        return app;
    }

    public Path home() {
        return home;
    }

    public Path toolLog() {
        return toolLog;
    }

    public Path tool(String kind) throws IOException {
        Path existing = tools.get(kind);
        if (existing != null) {
            return existing;
        }
        boolean windows = isWindows();
        String extension = windows ? ".cmd" : ".sh";
        Path wrapper = bin.resolve(kind + extension);
        String java = quote(windows, TestSupport.javaExecutable().toAbsolutePath().toString());
        String classpath = quote(windows, System.getProperty("java.class.path"));
        String className = FakeExternalTool.class.getName();
        String content = windows
                ? "@echo off\r\nchcp 65001 >nul\r\n\"" + TestSupport.javaExecutable().toAbsolutePath() + "\" -cp \""
                + System.getProperty("java.class.path") + "\" " + className + " " + kind + " %*\r\n"
                + "exit /b %ERRORLEVEL%\r\n"
                : "#!/bin/sh\nexec " + java + " -cp " + classpath + " " + className + " " + kind + " \"$@\"\n";
        Files.writeString(wrapper, content);
        if (!windows) {
            try {
                Files.setPosixFilePermissions(wrapper, EnumSet.of(PosixFilePermission.OWNER_READ,
                        PosixFilePermission.OWNER_WRITE, PosixFilePermission.OWNER_EXECUTE,
                        PosixFilePermission.GROUP_READ, PosixFilePermission.GROUP_EXECUTE,
                        PosixFilePermission.OTHERS_READ, PosixFilePermission.OTHERS_EXECUTE));
            } catch (UnsupportedOperationException ignored) {
                // POSIX権限を扱えないファイルシステムでは、ラッパーの実行可否をテスト結果に任せる。
            }
        }
        tools.put(kind, wrapper);
        return wrapper;
    }

    public ProcessResult run(List<String> arguments) throws IOException, InterruptedException {
        return run(arguments, Map.of(), Map.of());
    }

    public ProcessResult run(List<String> arguments, Map<String, String> extraEnvironment,
                             Map<String, String> extraSystemProperties)
            throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add("--headless");
        command.add("--data-dir=" + data);
        command.add("--repo-root=" + repo);
        command.addAll(arguments);

        Map<String, String> environment = new HashMap<>();
        environment.put(TOOL_LOG_ENV, toolLog.toString());
        environment.putAll(extraEnvironment);
        Map<String, String> properties = new HashMap<>();
        properties.put("user.home", home.toString());
        properties.putAll(extraSystemProperties);
        return TestSupport.runMain(command, root, environment, properties);
    }

    public List<String> plugin(String plugin, String action) {
        return new ArrayList<>(List.of("--plugin=" + plugin, "--action=" + action));
    }

    public String toolLogText() throws IOException {
        return Files.exists(toolLog) ? Files.readString(toolLog) : "";
    }

    public static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private static String quote(boolean windows, String value) {
        if (windows) {
            return "\"" + value.replace("\"", "\\\"") + "\"";
        }
        return "'" + value.replace("'", "'\\''") + "'";
    }
}
