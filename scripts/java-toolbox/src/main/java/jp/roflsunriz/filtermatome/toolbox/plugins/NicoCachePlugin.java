package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CancellationToken;
import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.FileSafety;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.ProcessRunner;
import jp.roflsunriz.filtermatome.toolbox.PropertiesDocument;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import java.awt.BorderLayout;
import java.awt.Desktop;
import java.awt.FlowLayout;
import java.io.IOException;
import java.net.URI;
import java.nio.file.AccessDeniedException;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.TimeUnit;

/**
 * NicoCache-Utilityの全メニューを、GUIとヘッドレスの同じ処理へ移植したプラグイン。
 * 外部コマンドはシェルを経由せず、変更系の操作には明示的な確認を要求する。
 */
public final class NicoCachePlugin implements ToolPlugin {
    private static final String CERTIFICATE_NAME = "NicoCache_nl CA";
    private static final String DEFAULT_PROXY_URL = "http://127.0.0.1:8080/proxy.pac";
    private static final String UPLOADER_URL = "https://nicocache.jpn.org/";
    private static final String WIKI_URL = "https://w.atwiki.jp/nicocachenlwiki/";
    private static final String BBS_URL = "https://ff5ch.syoboi.jp/?q=NicoCache";
    private static final String BOUNCY_CASTLE_URL =
            "https://www.bouncycastle.org/download/bouncy-castle-java/#latest";
    private static final Pattern VERSION_PARTS = Pattern.compile("\\d+(?:\\.\\d+)*");

    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("nicocache", "NicoCache管理",
                "NicoCache-Utilityの起動・停止・ビルド・証明書・プロキシ・環境設定を統合",
                true, true);
    }

    @Override
    public String readme() {
        return "NicoCache管理\n\n"
                + "旧nicocache-utility.pyの25メニューを、GUIと同じヘッドレス処理へ移植しています。\n"
                + "アプリケーションルート、データルート、ソースルートは固定パスから推測せず、引数・設定・config.propertiesから解決します。\n"
                + "起動、停止、リンク、拡張コンパイル、NicoCache本体ビルド、JAVA_HOME変更、証明書ストア、\n"
                + "プロキシ、Firefox、タスク登録、外部ページ・Windows管理画面を利用できます。\n"
                + "ヘッドレスで副作用を起こす操作には --yes、リンクやクラスファイルの再作成には --force または --overwrite、\n"
                + "確認だけなら --dry-run を指定してください。既存のFirefox設定や環境ファイルはバックアップしてから更新します。\n"
                + "Windows固有の証明書ストア、レジストリ、管理画面、ログオンタスクは別OSでは利用不可と明示して終了します。\n"
                + "NicoCacheBuild.jarがある場合はPowerShellを経由せずJDKだけで本体ビルドを実行し、古いbuild-javac.ps1しかない場合だけ\n"
                + "利用可能なPowerShell実装へ明示的に委譲します。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new NicoCachePanel(this, context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        Roots roots = roots(request, context);
        String action = request.action().isBlank()
                ? "diagnose" : request.action().toLowerCase(Locale.ROOT);
        return switch (action) {
            case "diagnose", "check" -> diagnose(roots, request, context);
            case "admin-check", "check-admin" -> adminCheck(request, context);
            case "launch", "start" -> launch(roots, request, context,
                    request.flag("headless"), request.flag("start"));
            case "launch-headless", "run-minimized", "minimized" ->
                    launch(roots, request, context, true, true);
            case "launch-gui", "run-gui", "gui" -> launch(roots, request, context, false, false);
            case "stop" -> stop(roots, request, context);
            case "force-stop", "force-stop-nicocache" -> forceStop(roots, request, context);
            case "links", "create-links", "symlinks" -> createLinks(roots, request, context);
            case "build", "build-extensions", "compile", "compile-extensions", "compile-java-files" ->
                    buildExtensions(roots, request, context);
            case "build-java-apps", "build-apps", "build-independent" ->
                    buildJavaApps(roots, request, context);
            case "java-version" -> javaVersion(request, context);
            case "set-java-home", "java-home" -> setJavaHome(request, context);
            case "generate-certificates" -> generateCertificates(roots, request, context);
            case "certificate-add", "certificate-delete", "certificate-renew" ->
                    certificate(action, roots, request, context);
            case "proxy-set", "proxy-remove", "proxy-check" -> proxy(action, request, context);
            case "firefox-proxy" -> firefoxProxy(request, context);
            case "task-install" -> taskInstall(roots, request, context);
            case "open", "open-url" -> openWeb(request, context,
                    request.value("target", "uploader"));
            case "open-uploader", "website", "open-website" -> openWeb(request, context, "uploader");
            case "open-wiki" -> openWeb(request, context, "wiki");
            case "open-bbs" -> openWeb(request, context, "bbs");
            case "open-bouncycastle", "bouncycastle" -> openWeb(request, context, "bouncycastle");
            case "open-adoptium", "adoptium" -> openWeb(request, context, "adoptium");
            case "open-environment", "environment", "environment-variables" ->
                    openSystemUi("environment", request, context);
            case "open-proxy-settings", "proxy-settings" ->
                    openSystemUi("proxy", request, context);
            case "open-certificate-manager", "certificate-manager" ->
                    openSystemUi("certificate", request, context);
            case "open-task-scheduler", "task-scheduler" ->
                    openSystemUi("task", request, context);
            default -> throw new IllegalArgumentException("未対応のNicoCacheアクションです: " + action);
        };
    }

    private static int diagnose(Roots roots, CommandRequest request, PluginContext context) {
        context.log().info("アプリケーションルート: " + roots.appRoot());
        context.log().info("データルート: " + roots.dataRoot());
        context.log().info("ソースルート: " + roots.sourceRoot());
        checkPath(context, "NicoCache_nl.jar", roots.appRoot().resolve("NicoCache_nl.jar"));
        checkPath(context, "NicoCacheLauncher.jar", roots.appRoot().resolve("NicoCacheLauncher.jar"));
        checkPath(context, "NicoCacheCA.jar", roots.appRoot().resolve("NicoCacheCA.jar"));
        checkPath(context, "NicoCacheBuild.jar", roots.appRoot().resolve("NicoCacheBuild.jar"));
        checkPath(context, "config.properties", roots.appRoot().resolve("config.properties"));
        checkPath(context, "extensions", roots.dataRoot().resolve("extensions"));
        checkPath(context, "local", roots.dataRoot().resolve("local"));
        checkPath(context, "nlFilters", roots.dataRoot().resolve("nlFilters"));
        context.log().info("OS: " + System.getProperty("os.name", "不明")
                + " / Windows機能: " + (isWindows() ? "利用可能" : "対象外"));
        for (String tool : List.of(
                request.value("java", configuredJava(context, "tools.java", "java")),
                request.value("javac", context.config().get("tools.javac", "javac")),
                request.value("ffmpeg", context.config().get("tools.ffmpeg", "ffmpeg")),
                request.value("ffprobe", context.config().get("tools.ffprobe", "ffprobe")))) {
            try {
                ProcessResult result = context.processes().capture(List.of(tool, "-version"), null);
                context.log().info(tool + (result.succeeded() ? " は利用可能です" : " は利用できません"));
            } catch (IOException | InterruptedException exception) {
                context.log().warn(tool + " を検出できません: " + exception.getMessage());
            }
        }
        if (roots.dataRoot().getFileSystem().supportedFileAttributeViews().contains("dos")) {
            context.log().info("DOSファイル属性を検出しました。シンボリックリンク作成権限は実作成時に確認します。");
        } else {
            context.log().info("POSIX系ファイル属性を検出しました。シンボリックリンクは通常ユーザーで作成できる場合があります。");
        }
        return 0;
    }

    private static int adminCheck(CommandRequest request, PluginContext context)
            throws IOException, InterruptedException {
        if (!isWindows()) {
            boolean root = "root".equalsIgnoreCase(System.getProperty("user.name", ""));
            context.log().info("Windows管理者権限の確認対象外です。実行ユーザー: "
                    + System.getProperty("user.name", "不明") + (root ? "（root）" : ""));
            return 0;
        }
        List<String> command = List.of(request.value("admin-tool", "net.exe"), "session");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: 管理者権限確認 " + ProcessRunner.format(command));
            return 0;
        }
        ProcessResult result = context.processes().capture(command, null);
        if (result.succeeded()) {
            context.log().info("管理者権限で実行されています。");
        } else {
            context.log().warn("管理者権限なしで実行されています。一部のWindows機能は制限されます。\n"
                    + result.output().trim());
        }
        return 0;
    }

    private static void checkPath(PluginContext context, String label, Path path) {
        context.log().info(label + ": " + (Files.exists(path) ? "存在" : "なし") + " -> " + path);
    }

    private static int launch(Roots roots, CommandRequest request, PluginContext context,
                              boolean childHeadless, boolean start) throws IOException {
        if (!request.dryRun() && !request.confirmed()) {
            throw new IllegalArgumentException("NicoCache起動には --yes が必要です。");
        }
        Path jar = launcherPath(roots, request);
        String defaultJava = childHeadless
                ? configuredJava(context, "tools.java", "java")
                : configuredJava(context, "tools.javaGui", isWindows() ? "javaw.exe" : "java");
        List<String> command = new ArrayList<>();
        command.add(request.value("java", defaultJava));
        command.add("-jar");
        command.add(jar.toString());
        if (childHeadless) command.add("--headless");
        if (start) command.add("--start");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        Process process = new ProcessBuilder(command)
                .directory(roots.appRoot().toFile()).inheritIO().start();
        context.log().info("NicoCache_nlを起動しました。PID=" + process.pid()
                + (childHeadless ? "（ヘッドレス）" : "（GUI）"));
        return 0;
    }

    private static int forceStop(Roots roots, CommandRequest request, PluginContext context)
            throws Exception {
        if (!request.dryRun() && !request.confirmed()) {
            throw new IllegalArgumentException("強制停止には --yes が必要です。");
        }
        Path launcher = launcherPath(roots, request);
        List<String> command = List.of(request.value("java", configuredJava(context, "tools.java", "java")),
                "-jar", launcher.toString(), "--headless", "--force-stop");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, roots.appRoot(), context.log(), new CancellationToken()).exitCode();
    }

    private static Path launcherPath(Roots roots, CommandRequest request) throws IOException {
        String configured = request.value("launcher", "NicoCacheLauncher.jar");
        Path jar = resolveRelative(roots.appRoot(), configured);
        if (!Files.isRegularFile(jar) && "NicoCacheLauncher.jar".equals(configured)) {
            jar = roots.appRoot().resolve("NicoCache_nl.jar");
        }
        if (!Files.isRegularFile(jar)) {
            throw new IOException("NicoCacheLauncher.jarが見つかりません: " + jar);
        }
        return jar.toAbsolutePath().normalize();
    }

    private static int stop(Roots roots, CommandRequest request, PluginContext context)
            throws InterruptedException {
        if (!request.confirmed()) throw new IllegalArgumentException("停止には --yes が必要です。");
        Path expectedJar = resolveRelative(roots.appRoot(),
                request.value("jar", roots.appRoot().resolve("NicoCache_nl.jar").toString()))
                .toAbsolutePath().normalize();
        List<ProcessHandle> targets;
        String pid = request.value("pid", "").trim();
        if (!pid.isBlank()) {
            long requestedPid;
            try {
                requestedPid = Long.parseLong(pid);
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("--pidには数値を指定してください。", exception);
            }
            targets = ProcessHandle.of(requestedPid).filter(ProcessHandle::isAlive).stream().toList();
        } else {
            targets = ProcessHandle.allProcesses()
                    .filter(handle -> isNicoCacheProcess(handle, expectedJar)).toList();
        }
        if (targets.isEmpty()) {
            context.log().info("NicoCache_nlの対象プロセスは見つかりませんでした。");
            return 0;
        }
        for (ProcessHandle target : targets) {
            context.log().info("停止対象PID: " + target.pid());
            if (request.dryRun()) continue;
            boolean accepted = request.flag("force") ? target.destroyForcibly() : target.destroy();
            if (!accepted) context.log().warn("停止要求を受け付けませんでした: PID=" + target.pid());
        }
        if (!request.dryRun()) {
            for (ProcessHandle target : targets) {
                try {
                    target.onExit().get(10, TimeUnit.SECONDS);
                    context.log().info("停止しました: PID=" + target.pid());
                } catch (java.util.concurrent.TimeoutException | java.util.concurrent.ExecutionException exception) {
                    context.log().warn("停止確認がタイムアウトしました: PID=" + target.pid());
                }
            }
        }
        return 0;
    }

    private static boolean isNicoCacheProcess(ProcessHandle handle, Path expectedJar) {
        String normalizedJar = expectedJar.toString().replace('\\', '/');
        var arguments = handle.info().arguments();
        if (arguments.isPresent()) {
            String[] values = arguments.get();
            for (int index = 0; index + 1 < values.length; index++) {
                if (values[index].equalsIgnoreCase("-jar")
                        && values[index + 1].replace('\\', '/').equalsIgnoreCase(normalizedJar)) return true;
            }
        }
        String normalizedCommand = handle.info().commandLine().orElse("").replace('\\', '/');
        return normalizedCommand.contains("-jar " + normalizedJar)
                || normalizedCommand.contains("-jar \"" + normalizedJar + "\"")
                || normalizedCommand.contains("-jar '" + normalizedJar + "'");
    }

    private static int createLinks(Roots roots, CommandRequest request, PluginContext context) throws IOException {
        if (!request.dryRun() && !request.confirmed()) throw new IllegalArgumentException("リンク作成には --yes が必要です。");
        int failed = 0;
        for (LinkMapping mapping : mappings(roots)) {
            if (!Files.exists(mapping.source())) {
                context.log().warn("リンク元がないためスキップ: " + mapping.source());
                continue;
            }
            Path link = mapping.link();
            if (request.dryRun()) {
                context.log().info("DRY-RUN: " + link + " -> " + mapping.source());
                continue;
            }
            if (Files.exists(link) || Files.isSymbolicLink(link)) {
                if (Files.isSymbolicLink(link)) {
                    Path target = Files.readSymbolicLink(link);
                    Path resolved = target.isAbsolute() ? target : link.getParent().resolve(target);
                    if (resolved.toAbsolutePath().normalize().equals(mapping.source().toAbsolutePath().normalize())
                            && !request.flag("force")) {
                        context.log().info("同一リンクをスキップ: " + link);
                        continue;
                    }
                    if (!request.flag("force")) {
                        context.log().warn("異なるリンクがあるためスキップ（--forceで再作成）: " + link);
                        continue;
                    }
                    Files.delete(link);
                } else {
                    context.log().warn("通常ファイル/フォルダを削除せずスキップ: " + link);
                    continue;
                }
            }
            if (!Files.isDirectory(link.getParent())) {
                context.log().warn("リンク先の親フォルダがないためスキップ: " + link.getParent());
                failed++;
                continue;
            }
            try {
                Files.createSymbolicLink(link, mapping.source());
                context.log().info("リンク作成: " + link + " -> " + mapping.source());
            } catch (UnsupportedOperationException | AccessDeniedException exception) {
                failed++;
                context.log().error("シンボリックリンクを作成できません。権限またはファイルシステムを確認してください: "
                        + exception.getMessage());
            }
        }
        return failed == 0 ? 0 : 1;
    }

    private static int buildExtensions(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        Path sourceRoot = resolveRelative(roots.sourceRoot(),
                request.value("source", roots.sourceRoot().resolve("extensions").toString()));
        Path jar = roots.appRoot().resolve("NicoCache_nl.jar");
        if (!Files.isDirectory(sourceRoot)) throw new IOException("拡張ソースが見つかりません: " + sourceRoot);
        if (!Files.isRegularFile(jar)) throw new IOException("クラスパス用JARが見つかりません: " + jar);

        List<Path> discovered;
        String explicit = request.value("file", "").trim();
        if (!explicit.isBlank()) {
            discovered = List.of(resolveRelative(sourceRoot, explicit));
        } else if (!request.inputs().isEmpty()) {
            discovered = request.inputs().stream().map(path -> resolveRelative(sourceRoot, path)).toList();
        } else {
            try (var stream = Files.list(sourceRoot)) {
                discovered = stream.filter(Files::isRegularFile)
                        .filter(path -> path.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".java"))
                        .sorted().toList();
            }
        }
        if (discovered.isEmpty()) throw new IOException("コンパイル対象のJavaソースがありません。");
        boolean includeMovieFetcher = request.flag("include-movie-fetcher");
        List<Path> sources = new ArrayList<>();
        for (Path source : discovered) {
            String name = source.getFileName().toString();
            if (!Files.isRegularFile(source)) throw new IOException("Javaソースがありません: " + source);
            if (explicit.isBlank() && name.equalsIgnoreCase("nlMovieFetcher.java") && !includeMovieFetcher) {
                context.log().info("nlMovieFetcher.javaは既定でスキップしました（--include-movie-fetcherで有効化）。");
                continue;
            }
            if (explicit.isBlank() && name.toLowerCase(Locale.ROOT).contains("sample")) {
                context.log().info("サンプルソースをスキップしました: " + name);
                continue;
            }
            sources.add(source);
        }
        if (sources.isEmpty()) {
            context.log().info("選択されたJavaソースはありません。既存ファイルを変更していません。");
            return 0;
        }
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("コンパイルには --yes が必要です。");

        Path temp = request.dryRun() ? null : Files.createTempDirectory("filter-matome-extension-build-");
        int failures = 0;
        try {
            for (Path source : sources) {
                Path compileDir = request.dryRun() ? null : Files.createTempDirectory(temp, "one-");
                List<String> command = List.of(request.value("javac", context.config().get("tools.javac", "javac")),
                        "-Xlint", "-classpath", jar + java.io.File.pathSeparator + sourceRoot,
                        "-d", request.dryRun() ? sourceRoot.resolve(".toolbox-dry-run").toString() : compileDir.toString(),
                        source.toString());
                if (request.dryRun()) {
                    context.log().info("DRY-RUN: " + ProcessRunner.format(command));
                    continue;
                }
                ProcessResult result = context.processes().run(command, sourceRoot, context.log(), new CancellationToken());
                if (!result.succeeded()) {
                    failures++;
                    FileSafety.deleteTree(compileDir);
                    continue;
                }
                String className = source.getFileName().toString().replaceFirst("\\.java$", ".class");
                Path compiled = compileDir.resolve(className);
                if (!Files.isRegularFile(compiled)) {
                    failures++;
                    context.log().error("期待したクラスファイルが生成されません: " + className);
                    FileSafety.deleteTree(compileDir);
                    continue;
                }
                try (var generated = Files.walk(compileDir)) {
                    List<Path> extra = generated.filter(Files::isRegularFile)
                            .filter(path -> path.getFileName().toString().endsWith(".class"))
                            .filter(path -> !path.equals(compiled)).toList();
                    if (!extra.isEmpty()) {
                        failures++;
                        context.log().error("補助クラスが生成されたため安全のため配置しません: " + extra);
                        FileSafety.deleteTree(compileDir);
                        continue;
                    }
                }
                Path target = source.resolveSibling(className);
                boolean overwrite = request.overwrite() || request.flag("force");
                if (Files.exists(target) && !overwrite) {
                    context.log().warn("既存クラスを保護してスキップしました（--overwriteまたは--forceで更新）: " + target);
                    FileSafety.deleteTree(compileDir);
                    continue;
                }
                if (Files.exists(target)) {
                    context.log().info("既存クラスをバックアップしました: " + FileSafety.backup(target));
                }
                Files.copy(compiled, target, StandardCopyOption.REPLACE_EXISTING);
                context.log().info("コンパイル成功: " + source.getFileName());
                FileSafety.deleteTree(compileDir);
            }
        } finally {
            if (temp != null) FileSafety.deleteTree(temp);
        }
        return failures == 0 ? 0 : 1;
    }

    private static int buildJavaApps(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        if (!request.dryRun() && !request.confirmed()) throw new IllegalArgumentException("独立Javaアプリのビルドには --yes が必要です。");
        Path buildJar = resolveRelative(roots.appRoot(),
                request.value("build-jar", "NicoCacheBuild.jar"));
        List<String> command;
        if (Files.isRegularFile(buildJar)) {
            command = new ArrayList<>(List.of(request.value("java", configuredJava(context, "tools.java", "java")),
                    "-jar", buildJar.toString(), "--root=" + roots.appRoot()));
            String library = request.value("library-dir", "").trim();
            if (!library.isBlank()) command.add("--library-dir=" + resolveRelative(roots.appRoot(), library));
            String output = request.value("output-dir", "").trim();
            if (!output.isBlank()) command.add("--output-dir=" + resolveRelative(roots.appRoot(), output));
            if (request.flag("clean")) command.add("--clean");
        } else {
            Path script = resolveRelative(roots.appRoot(),
                    request.value("build-script", "build-javac.ps1"));
            if (!Files.isRegularFile(script)) {
                throw new IOException("NicoCacheBuild.jarまたはbuild-javac.ps1が見つかりません: " + buildJar);
            }
            command = scriptCommand(script, request, context);
        }
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, roots.appRoot(), context.log(), new CancellationToken()).exitCode();
    }

    private static List<String> scriptCommand(Path script, CommandRequest request, PluginContext context) {
        String name = script.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".ps1")) {
            List<String> command = new ArrayList<>(List.of(
                    request.value("powershell", context.config().get("tools.powershell", isWindows() ? "powershell.exe" : "pwsh")),
                    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script.toString()));
            String version = request.value("java-version", "").trim();
            if (!version.isBlank()) { command.add("-JavaVersion"); command.add(version); }
            String library = request.value("library-dir", "").trim();
            if (!library.isBlank()) { command.add("-LibraryDirectory"); command.add(library); }
            if (request.flag("clean")) command.add("-Clean");
            return command;
        }
        if (name.endsWith(".bat") || name.endsWith(".cmd")) {
            return List.of(request.value("cmd", isWindows() ? "cmd.exe" : "cmd"), "/d", "/c", script.toString());
        }
        return List.of(script.toString());
    }

    private static int javaVersion(CommandRequest request, PluginContext context) throws IOException, InterruptedException {
        for (String tool : List.of(request.value("java", configuredJava(context, "tools.java", "java")),
                request.value("javac", context.config().get("tools.javac", "javac")))) {
            ProcessResult result = context.processes().capture(List.of(tool, "-version"), null);
            context.log().info(tool + " exit=" + result.exitCode() + "\n" + result.output().trim());
        }
        return 0;
    }

    private static int setJavaHome(CommandRequest request, PluginContext context) throws Exception {
        Path selected = locateJdk(request);
        if (!request.dryRun() && !request.confirmed()) throw new IllegalArgumentException("JAVA_HOME変更には --yes が必要です。");
        if (isWindows()) {
            List<String> command = List.of(request.value("setx", "setx.exe"), "JAVA_HOME", selected.toString());
            if (request.dryRun()) {
                context.log().info("DRY-RUN: " + ProcessRunner.format(command));
                return 0;
            }
            return context.processes().run(command, selected, context.log(), new CancellationToken()).exitCode();
        }
        Path envFile = resolveRelative(Path.of(System.getProperty("user.home", ".")),
                request.value("env-file", ".config/filter-matome/java-home.env"));
        String escaped = selected.toString().replace("'", "'\\''");
        String content = "# filter-matome Java Toolboxが生成しました。\n"
                + "export JAVA_HOME='" + escaped + "'\n";
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + envFile + " にJAVA_HOMEを保存: " + selected);
            return 0;
        }
        Files.createDirectories(envFile.toAbsolutePath().getParent());
        if (Files.exists(envFile)) context.log().info("JAVA_HOME設定をバックアップしました: " + FileSafety.backup(envFile));
        writeAtomically(envFile, content);
        context.log().info("JAVA_HOME設定を保存しました: " + envFile + "（shellでsourceしてください）");
        return 0;
    }

    private static Path locateJdk(CommandRequest request) throws IOException {
        String explicit = request.value("java-home", "").trim();
        if (!explicit.isBlank()) return requireJdk(resolveRelative(Path.of("."), explicit));

        String explicitRoot = request.value("jdk-root", "").trim();
        if (!explicitRoot.isBlank()) {
            Set<Path> explicitCandidates = new HashSet<>();
            collectJdkCandidates(Path.of(explicitRoot).toAbsolutePath().normalize(), explicitCandidates);
            return explicitCandidates.stream()
                    .max(Comparator.comparing(NicoCachePlugin::jdkVersionKey)
                            .thenComparing(NicoCachePlugin::lastModified)
                            .thenComparing(Path::toString))
                    .orElseThrow(() -> new IOException("指定されたJDKルートにJDKがありません: " + explicitRoot));
        }

        Set<Path> roots = new LinkedHashSet<>();
        addPath(roots, System.getenv("JAVA_HOME"));
        addPath(roots, System.getProperty("java.home", ""));
        addPath(roots, System.getenv("ProgramFiles"));
        addPath(roots, System.getenv("ProgramFiles(x86)"));
        if (isWindows()) {
            addPath(roots, envPath("ProgramFiles", "Eclipse Adoptium"));
            addPath(roots, envPath("ProgramFiles", "Java"));
            addPath(roots, envPath("ProgramFiles(x86)", "Eclipse Adoptium"));
        } else {
            addPath(roots, "/usr/lib/jvm");
            addPath(roots, "/usr/java");
            addPath(roots, "/Library/Java/JavaVirtualMachines");
            addPath(roots, Path.of(System.getProperty("user.home", "."), ".jdks").toString());
            addPath(roots, Path.of(System.getProperty("user.home", "."), ".sdkman/candidates/java").toString());
        }

        Set<Path> candidates = new HashSet<>();
        for (Path root : roots) collectJdkCandidates(root, candidates);
        return candidates.stream()
                .max(Comparator.comparing(NicoCachePlugin::jdkVersionKey)
                        .thenComparing(NicoCachePlugin::lastModified)
                        .thenComparing(Path::toString))
                .orElseThrow(() -> new IOException("JDKが見つかりません。--java-homeまたは--jdk-rootで指定してください。"));
    }

    private static void collectJdkCandidates(Path root, Set<Path> candidates) throws IOException {
        if (!Files.isDirectory(root)) return;
        if (isJdk(root)) candidates.add(root.toAbsolutePath().normalize());
        try (var children = Files.list(root)) {
            for (Path child : children.toList()) {
                if (isJdk(child)) candidates.add(child.toAbsolutePath().normalize());
                Path macHome = child.resolve("Contents/Home");
                if (isJdk(macHome)) candidates.add(macHome.toAbsolutePath().normalize());
            }
        }
    }

    private static Path requireJdk(Path candidate) throws IOException {
        Path normalized = candidate.toAbsolutePath().normalize();
        if (!isJdk(normalized)) throw new IOException("JDKではありません（bin/javaとbin/javacが必要です）: " + normalized);
        return normalized;
    }

    private static boolean isJdk(Path path) {
        if (!Files.isDirectory(path.resolve("bin"))) return false;
        return executable(path.resolve("bin/java")) && executable(path.resolve("bin/javac"));
    }

    private static boolean executable(Path path) {
        return Files.isRegularFile(path) || Files.isRegularFile(path.resolveSibling(path.getFileName() + ".exe"));
    }

    private static String jdkVersionKey(Path path) {
        Matcher matcher = VERSION_PARTS.matcher(path.getFileName().toString());
        String raw = matcher.find() ? matcher.group() : "0";
        StringBuilder key = new StringBuilder();
        for (String part : raw.split("\\.")) {
            try { key.append(String.format(Locale.ROOT, "%08d", Integer.parseInt(part))); }
            catch (NumberFormatException ignored) { key.append("00000000"); }
        }
        return key.toString();
    }

    private static long lastModified(Path path) {
        try { return Files.getLastModifiedTime(path).toMillis(); }
        catch (IOException ignored) { return Long.MIN_VALUE; }
    }

    private static void addPath(Set<Path> paths, String raw) {
        if (raw != null && !raw.isBlank()) paths.add(Path.of(raw).toAbsolutePath().normalize());
    }

    private static String envPath(String variable, String child) {
        String value = System.getenv(variable);
        return value == null || value.isBlank() ? "" : Path.of(value, child).toString();
    }

    private static int generateCertificates(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        Path caJar = roots.appRoot().resolve("NicoCacheCA.jar");
        Path targets = roots.appRoot().resolve("certificate-targets.txt");
        if (!Files.isRegularFile(caJar) || !Files.isRegularFile(targets)) {
            throw new IOException("NicoCacheCA.jarまたはcertificate-targets.txtが見つかりません。");
        }
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("証明書生成には --yes が必要です。");
        List<String> command = List.of(request.value("java", configuredJava(context, "tools.java", "java")),
                "-jar", caJar.toString(), "--headless", "--targets-file=" + targets);
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, roots.appRoot(), context.log(), new CancellationToken()).exitCode();
    }

    private static int certificate(String action, Roots roots, CommandRequest request, PluginContext context) throws Exception {
        if (!isWindows()) throw new IOException("証明書ストア操作はWindowsのcertutilに依存するため、このOSでは利用できません。");
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("証明書ストア変更には --yes が必要です。");
        Path cert = certificatePath(roots);
        String certutil = request.value("certutil", "certutil.exe");
        if (action.equals("certificate-delete")) {
            return runOrDryRun(List.of(certutil, "-delstore", "ROOT", CERTIFICATE_NAME), roots.appRoot(), request, context);
        }
        if (!Files.isRegularFile(cert)) throw new IOException("ca.cerが見つかりません: " + cert);
        List<String> add = List.of(certutil, "-addstore", "ROOT", cert.toString());
        if (action.equals("certificate-add") && !request.dryRun()) {
            ProcessResult existing = context.processes().capture(List.of(certutil, "-store", "ROOT", CERTIFICATE_NAME), roots.appRoot());
            if (existing.succeeded() && existing.output().contains(CERTIFICATE_NAME)) {
                context.log().info("証明書は既に登録されています。追加をスキップしました。");
                return 0;
            }
        }
        if (action.equals("certificate-renew")) {
            List<String> delete = List.of(certutil, "-delstore", "ROOT", CERTIFICATE_NAME);
            if (request.dryRun()) {
                context.log().info("DRY-RUN: " + ProcessRunner.format(delete));
                context.log().info("DRY-RUN: " + ProcessRunner.format(add));
                return 0;
            }
            ProcessResult deleted = context.processes().run(delete, roots.appRoot(), context.log(), new CancellationToken());
            if (!deleted.succeeded()) context.log().warn("既存証明書の削除に失敗しました。追加を続行します。");
        } else if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(List.of(certutil, "-store", "ROOT", CERTIFICATE_NAME)));
            context.log().info("DRY-RUN: " + ProcessRunner.format(add));
            return 0;
        }
        return context.processes().run(add, roots.appRoot(), context.log(), new CancellationToken()).exitCode();
    }

    private static Path certificatePath(Roots roots) {
        for (Path candidate : List.of(roots.dataRoot().resolve("certs/ca.cer"),
                roots.appRoot().resolve("certs/ca.cer"), roots.sourceRoot().resolve("certs/ca.cer"))) {
            if (Files.isRegularFile(candidate)) return candidate;
        }
        return roots.dataRoot().resolve("certs/ca.cer");
    }

    private static int proxy(String action, CommandRequest request, PluginContext context) throws Exception {
        if (!isWindows()) throw new IOException("Windows Internet Settingsのレジストリ操作はこのOSでは利用できません。");
        String key = "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
        String url = request.value("proxy-url", DEFAULT_PROXY_URL);
        List<String> command = switch (action) {
            case "proxy-set" -> List.of(request.value("reg", "reg.exe"), "ADD", key, "/f", "/v", "AutoConfigURL", "/t", "REG_SZ", "/d", url);
            case "proxy-remove" -> List.of(request.value("reg", "reg.exe"), "DELETE", key, "/v", "AutoConfigURL", "/f");
            default -> List.of(request.value("reg", "reg.exe"), "QUERY", key, "/v", "AutoConfigURL");
        };
        if (!action.equals("proxy-check") && !request.confirmed() && !request.dryRun()) {
            throw new IllegalArgumentException("プロキシ設定変更には --yes が必要です。");
        }
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        ProcessResult result = context.processes().capture(command, null);
        context.log().info(result.output().trim());
        return result.exitCode();
    }

    private static int firefoxProxy(CommandRequest request, PluginContext context) throws IOException {
        Path profile = profilePath(request);
        Path userJs = profile.resolve("user.js");
        String proxyUrl = request.value("proxy-url", DEFAULT_PROXY_URL);
        String addition = "user_pref(\"network.proxy.autoconfig_url\", \"" + proxyUrl + "\");" + System.lineSeparator()
                + "user_pref(\"security.enterprise_roots.enabled\", true);" + System.lineSeparator();
        String current = Files.exists(userJs) ? Files.readString(userJs) : "";
        if (current.contains("network.proxy.autoconfig_url") && current.contains("security.enterprise_roots.enabled")) {
            context.log().info("Firefox user.jsは既に設定済みです: " + userJs);
            return 0;
        }
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("Firefox設定変更には --yes が必要です。");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + userJs + " へFirefoxプロキシ設定を追加");
            return 0;
        }
        Files.createDirectories(userJs.toAbsolutePath().getParent());
        if (Files.exists(userJs)) context.log().info("user.jsをバックアップしました: " + FileSafety.backup(userJs));
        Files.writeString(userJs, current + (current.endsWith(System.lineSeparator()) || current.isEmpty() ? "" : System.lineSeparator()) + addition,
                StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        context.log().info("Firefoxプロキシ設定を追加しました。Firefox再起動後に反映されます: " + userJs);
        return 0;
    }

    private static Path profilePath(CommandRequest request) throws IOException {
        String explicit = request.value("firefox-profile", "").trim();
        if (!explicit.isBlank()) {
            Path profile = Path.of(explicit).toAbsolutePath().normalize();
            if (!Files.isDirectory(profile)) throw new IOException("Firefoxプロファイルが見つかりません: " + profile);
            return profile;
        }
        Path base = firefoxProfilesBase();
        if (!Files.isDirectory(base)) throw new IOException("Firefoxプロファイルディレクトリが見つかりません: " + base);
        try (var profiles = Files.list(base)) {
            return profiles.filter(Files::isDirectory)
                    .filter(path -> path.getFileName().toString().contains(".default"))
                    .sorted().findFirst()
                    .orElseThrow(() -> new IOException("Firefoxの既定プロファイルが見つかりません: " + base));
        }
    }

    private static int taskInstall(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("タスク登録には --yes が必要です。");
        Path launcher = launcherPath(roots, request);
        List<String> command = List.of(request.value("java", configuredJava(context, "tools.java", "java")),
                "-jar", launcher.toString(), "--headless", "--task-install",
                "--task-name=" + request.value("task-name", "NicoCache_nl"));
        return runOrDryRun(command, roots.appRoot(), request, context);
    }

    private static int openWeb(CommandRequest request, PluginContext context, String target) throws Exception {
        String url = request.value("url", webUrl(target));
        if (request.dryRun()) {
            context.log().info("DRY-RUN: ブラウザーで開く " + url);
            return 0;
        }
        if (request.flag("headless") || !Desktop.isDesktopSupported()) {
            throw new IOException("GUIブラウザーを開けないため、ヘッドレス実行ではWebページを開けません。");
        }
        Desktop.getDesktop().browse(URI.create(url));
        context.log().info("ブラウザーで開きました: " + url);
        return 0;
    }

    private static String webUrl(String target) {
        return switch (target.toLowerCase(Locale.ROOT)) {
            case "uploader", "website" -> UPLOADER_URL;
            case "wiki" -> WIKI_URL;
            case "bbs" -> BBS_URL;
            case "bouncycastle", "bc" -> BOUNCY_CASTLE_URL;
            case "adoptium", "jdk" -> adoptiumUrl();
            default -> UPLOADER_URL;
        };
    }

    private static String adoptiumUrl() {
        String os = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        String osParameter = os.contains("win") ? "windows" : os.contains("mac") ? "mac" : os.contains("linux") ? "linux" : "any";
        String arch = System.getProperty("os.arch", "").toLowerCase(Locale.ROOT).contains("aarch64") ? "aarch64" : "x64";
        return "https://adoptium.net/temurin/releases/?os=" + osParameter
                + "&arch=" + arch + "&package=jdk&version=17";
    }

    private static int openSystemUi(String kind, CommandRequest request, PluginContext context) throws Exception {
        if (!isWindows()) throw new IOException("Windowsの" + kind + "画面はこのOSでは利用できません。");
        List<String> command = switch (kind) {
            case "environment" -> List.of(request.value("environment-tool", "rundll32.exe"), "sysdm.cpl,EditEnvironmentVariables");
            case "proxy" -> List.of(request.value("proxy-settings-tool", "explorer.exe"), "ms-settings:network-proxy");
            case "certificate" -> List.of(request.value("certificate-manager-tool", "mmc.exe"), "certmgr.msc");
            case "task" -> List.of(request.value("task-scheduler-tool", "mmc.exe"), "taskschd.msc");
            default -> throw new IllegalArgumentException("不明なWindows画面です: " + kind);
        };
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        if (request.flag("headless")) throw new IOException("Windows管理画面はヘッドレス実行では開けません。");
        Process process = new ProcessBuilder(command).inheritIO().start();
        context.log().info(kind + "画面を開きました。PID=" + process.pid());
        return 0;
    }

    private static int runOrDryRun(List<String> command, Path workingDirectory,
                                   CommandRequest request, PluginContext context)
            throws IOException, InterruptedException {
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, workingDirectory, context.log(), new CancellationToken()).exitCode();
    }

    private static String configuredJava(PluginContext context, String key, String fallback) {
        String configured = context.config().get(key, "").trim();
        if (!configured.isBlank()) return configured;
        String legacy = System.getenv("NICOCACHE_JAVA");
        return legacy == null || legacy.isBlank() ? fallback : legacy;
    }

    private static boolean isWindows() {
        String testPlatform = System.getProperty("filterMatome.toolbox.test.platform", "").trim();
        if (!testPlatform.isBlank()) return testPlatform.equalsIgnoreCase("windows");
        return System.getProperty("os.name", "").toLowerCase(Locale.ROOT).contains("win");
    }

    private static Path firefoxProfilesBase() {
        String appData = System.getenv("APPDATA");
        if (isWindows() && appData != null && !appData.isBlank()) {
            return Path.of(appData, "Mozilla", "Firefox", "Profiles");
        }
        return Path.of(System.getProperty("user.home", "."), ".mozilla", "firefox");
    }

    private static Roots roots(CommandRequest request, PluginContext context) throws IOException {
        Path app = pathValue(request, "app-root", context.config().get("nicocache.appRoot", ""));
        if (app == null) app = context.paths().repoRoot();
        Path data = pathValue(request, "data-root", context.config().get("nicocache.dataRoot", ""));
        if (data == null) data = resolveDataRoot(app);
        Path source = pathValue(request, "source-root", context.paths().repoRoot().toString());
        return new Roots(app.toAbsolutePath().normalize(), data.toAbsolutePath().normalize(), source.toAbsolutePath().normalize());
    }

    private static Path pathValue(CommandRequest request, String key, String fallback) {
        String value = request.value(key, fallback).trim();
        return value.isBlank() ? null : Path.of(value);
    }

    private static Path resolveRelative(Path base, String raw) {
        Path value = Path.of(raw);
        return value.isAbsolute() ? value.normalize() : base.resolve(value).normalize();
    }

    private static Path resolveDataRoot(Path app) throws IOException {
        Path config = app.resolve("config.properties");
        if (Files.isRegularFile(config)) {
            PropertiesDocument document = PropertiesDocument.load(config);
            String configured = document.value("userDataRoot");
            if (configured != null && !configured.isBlank()) {
                Path path = Path.of(configured.replace("\\/", "/"));
                return path.isAbsolute() ? path : app.resolve(path);
            }
        }
        return app;
    }

    private static void writeAtomically(Path target, String content) throws IOException {
        Path temp = target.resolveSibling(target.getFileName() + ".tmp-" + Instant.now().toEpochMilli());
        try {
            Files.writeString(temp, content, StandardCharsets.UTF_8, StandardOpenOption.CREATE_NEW);
            try {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (AtomicMoveNotSupportedException ignored) {
                Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    private static List<LinkMapping> mappings(Roots roots) {
        String[][] values = {
                {"scripts", "scripts"}, {"local/background-images", "local/background-images"},
                {"local/features", "local/features"}, {"local/images", "local/images"},
                {"local/mime.types", "local/mime.types"}, {"nlFilters/100_features.txt", "nlFilters/100_features.txt"},
                {"nlFilters/101_disable_official_function.txt", "nlFilters/101_disable_official_function.txt"},
                {"nlFilters/105_premium_hide.txt", "nlFilters/105_premium_hide.txt"},
                {"local/features/dist/features.js", "local/list.js"}, {"local/features/dist/features.js.map", "local/list.js.map"},
                {"extensions/CommentFilterLogger.class", "extensions/CommentFilterLogger.class"},
                {"extensions/CustomCacheReturner.class", "extensions/CustomCacheReturner.class"},
                {"extensions/downloadThruFFmpeg.class", "extensions/downloadThruFFmpeg.class"},
                {"extensions/ExtUtil.class", "extensions/ExtUtil.class"},
                {"extensions/FilterMatomeCacheControl.class", "extensions/FilterMatomeCacheControl.class"},
                {"extensions/FilterMatomeSeriesAlerts.class", "extensions/FilterMatomeSeriesAlerts.class"},
                {"extensions/NicochartInfoProxy.class", "extensions/NicochartInfoProxy.class"},
                {"extensions/nlGpac.class", "extensions/nlGpac.class"}
        };
        List<LinkMapping> result = new ArrayList<>();
        for (String[] value : values) result.add(new LinkMapping(roots.sourceRoot().resolve(value[0]), roots.dataRoot().resolve(value[1])));
        return result;
    }

    private record Roots(Path appRoot, Path dataRoot, Path sourceRoot) {
    }

    private record LinkMapping(Path source, Path link) {
    }

    private static final class NicoCachePanel extends JPanel {
        private final NicoCachePlugin plugin;
        private final PluginContext context;
        private final JTextField appRoot = new JTextField();
        private final JTextField dataRoot = new JTextField();
        private final JTextField sourceRoot = new JTextField();
        private final JCheckBox dryRun = new JCheckBox("ドライラン", true);
        private final JCheckBox force = new JCheckBox("既存リンク・クラスを再作成");
        private final JCheckBox includeMovieFetcher = new JCheckBox("nlMovieFetcherを含める");
        private final JTextArea log = new JTextArea();

        private NicoCachePanel(NicoCachePlugin plugin, PluginContext context) {
            super(new BorderLayout(8, 8));
            this.plugin = plugin;
            this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            sourceRoot.setText(context.paths().repoRoot().toString());
            appRoot.setName("nicocache-app-root");
            dataRoot.setName("nicocache-data-root");
            sourceRoot.setName("nicocache-source-root");
            dryRun.setName("nicocache-dry-run");
            force.setName("nicocache-force");
            includeMovieFetcher.setName("nicocache-include-movie-fetcher");
            build();
        }

        private void build() {
            JPanel fields = new JPanel(new java.awt.GridLayout(3, 2, 5, 5));
            fields.setBorder(BorderFactory.createTitledBorder("パス（空欄は自動解決）"));
            fields.add(new JLabel("アプリルート")); fields.add(appRoot);
            fields.add(new JLabel("データルート")); fields.add(dataRoot);
            fields.add(new JLabel("ソースルート")); fields.add(sourceRoot);

            JPanel controls = new JPanel();
            controls.setLayout(new BoxLayout(controls, BoxLayout.Y_AXIS));
            addRow(controls, "診断・起動", new String[][]{
                    {"診断", "diagnose"}, {"権限確認", "admin-check"},
                    {"ヘッドレス起動", "launch-headless"}, {"GUI起動", "launch-gui"},
                    {"安全停止", "stop"}, {"強制停止", "force-stop"}
            });
            addRow(controls, "ビルド・リンク", new String[][]{
                    {"リンク", "links"}, {"拡張ビルド", "compile-java-files"}, {"NicoCache本体ビルド", "build-java-apps"}
            });
            addRow(controls, "Java・証明書", new String[][]{
                    {"Javaバージョン", "java-version"}, {"JAVA_HOME設定", "set-java-home"},
                    {"証明書生成", "generate-certificates"}, {"証明書登録", "certificate-add"},
                    {"証明書削除", "certificate-delete"}, {"証明書更新", "certificate-renew"},
                    {"証明書マネージャー", "open-certificate-manager"}
            });
            addRow(controls, "プロキシ・タスク", new String[][]{
                    {"レジストリ設定", "proxy-set"}, {"レジストリ削除", "proxy-remove"},
                    {"レジストリ確認", "proxy-check"}, {"Firefox設定", "firefox-proxy"},
                    {"プロキシ画面", "open-proxy-settings"}, {"タスク登録", "task-install"},
                    {"タスクスケジューラー", "open-task-scheduler"}, {"環境変数画面", "open-environment"}
            });
            addRow(controls, "Webページ", new String[][]{
                    {"アップローダー", "open-uploader"}, {"Wiki", "open-wiki"}, {"掲示板", "open-bbs"},
                    {"BouncyCastle", "open-bouncycastle"}, {"Temurin JDK", "open-adoptium"}
            });

            JPanel options = new JPanel(new FlowLayout(FlowLayout.LEFT));
            options.add(dryRun); options.add(force); options.add(includeMovieFetcher);
            controls.add(options);
            log.setEditable(false); log.setLineWrap(true); log.setWrapStyleWord(true);
            context.log().addListener(line -> javax.swing.SwingUtilities.invokeLater(() -> {
                log.append(line + System.lineSeparator());
                log.setCaretPosition(log.getDocument().getLength());
            }));
            add(fields, BorderLayout.NORTH);
            add(new JScrollPane(log), BorderLayout.CENTER);
            add(new JScrollPane(controls), BorderLayout.SOUTH);
        }

        private void addRow(JPanel parent, String title, String[][] actions) {
            JPanel row = new JPanel(new FlowLayout(FlowLayout.LEFT));
            row.setBorder(BorderFactory.createTitledBorder(title));
            for (String[] action : actions) addAction(row, action[0], action[1]);
            parent.add(row);
        }

        private void addAction(JPanel panel, String label, String action) {
            JButton button = new JButton(label);
            button.setName("nicocache-action-" + action);
            button.setToolTipText(action);
            button.addActionListener(event -> runAction(action));
            panel.add(button);
        }

        private void runAction(String action) {
            boolean destructive = Set.of("launch-headless", "launch-gui", "stop", "force-stop", "links",
                    "compile-java-files", "build-java-apps", "set-java-home", "certificate-add",
                    "certificate-delete", "certificate-renew", "proxy-set", "proxy-remove",
                    "firefox-proxy", "task-install").contains(action);
            if (destructive && !dryRun.isSelected() && JOptionPane.showConfirmDialog(this,
                    "この操作は外部ファイルやプロセスに影響します。続行しますか？", "確認",
                    JOptionPane.YES_NO_OPTION) != JOptionPane.YES_OPTION) return;
            Map<String, String> values = new java.util.HashMap<>();
            values.put("app-root", appRoot.getText());
            values.put("data-root", dataRoot.getText());
            values.put("source-root", sourceRoot.getText());
            values.put("force", Boolean.toString(force.isSelected()));
            values.put("include-movie-fetcher", Boolean.toString(includeMovieFetcher.isSelected()));
            values.put("headless", Boolean.toString(!action.equals("launch-gui")));
            values.put("start", Boolean.toString(action.equals("launch-headless")));
            CommandRequest request = new CommandRequest(action, List.of(), values, false,
                    force.isSelected(), dryRun.isSelected(), true, null);
            new SwingWorker<Integer, Void>() {
                @Override protected Integer doInBackground() throws Exception { return plugin.run(request, context); }
                @Override protected void done() {
                    try { context.log().info(action + "終了: exit=" + get()); }
                    catch (Exception exception) { context.log().error(action + "失敗: " + exception.getMessage()); }
                }
            }.execute();
        }
    }
}
