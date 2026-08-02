package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.FileSafety;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.ProcessRunner;
import jp.roflsunriz.filtermatome.toolbox.PropertiesDocument;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.Desktop;
import java.io.IOException;
import java.net.URI;
import java.nio.file.AccessDeniedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/** NicoCache_nlの起動、診断、リンク、拡張コンパイルを安全に扱うプラグイン。 */
public final class NicoCachePlugin implements ToolPlugin {
    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("nicocache", "NicoCache管理", "NicoCache_nlの診断・起動・停止・リンク・拡張ビルド", true, true);
    }

    @Override
    public String readme() {
        return "NicoCache管理\n\n"
                + "アプリケーションルートとデータルートを固定パスから推測せず、引数・設定・config.propertiesから解決します。\n"
                + "リンク作成は既存の通常ファイルを削除せず、同一リンクだけをスキップします。\n"
                + "停止・リンク再作成・コンパイルはヘッドレスでは --yes、上書きは --force を明示してください。\n"
                + "管理者権限や証明書ストア、タスクスケジューラーなどOS固有の操作は診断結果へ明示し、"
                + "別OSで無理に実行しません。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new NicoCachePanel(this, context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        Roots roots = roots(request, context);
        String action = request.action().isBlank() ? "diagnose" : request.action().toLowerCase();
        return switch (action) {
            case "diagnose", "check" -> diagnose(roots, context);
            case "launch", "start" -> launch(roots, request, context);
            case "stop" -> stop(request, context);
            case "links", "create-links", "symlinks" -> createLinks(roots, request, context);
            case "build", "build-extensions" -> buildExtensions(roots, request, context);
            case "java-version" -> javaVersion(request, context);
            case "generate-certificates" -> generateCertificates(roots, request, context);
            case "certificate-add", "certificate-delete", "certificate-renew" -> certificate(action, roots, request, context);
            case "proxy-set", "proxy-remove", "proxy-check" -> proxy(action, request, context);
            case "firefox-proxy" -> firefoxProxy(roots, request, context);
            case "task-install" -> taskInstall(roots, request, context);
            case "open" -> openUrl(request, context);
            default -> throw new IllegalArgumentException("未対応のNicoCacheアクションです: " + action);
        };
    }

    private static int diagnose(Roots roots, PluginContext context) {
        context.log().info("アプリケーションルート: " + roots.appRoot());
        context.log().info("データルート: " + roots.dataRoot());
        checkPath(context, "NicoCache_nl.jar", roots.appRoot().resolve("NicoCache_nl.jar"));
        checkPath(context, "config.properties", roots.appRoot().resolve("config.properties"));
        checkPath(context, "extensions", roots.dataRoot().resolve("extensions"));
        checkPath(context, "local", roots.dataRoot().resolve("local"));
        checkPath(context, "nlFilters", roots.dataRoot().resolve("nlFilters"));
        for (String tool : List.of("java", "javac", "ffmpeg", "ffprobe")) {
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

    private static void checkPath(PluginContext context, String label, Path path) {
        context.log().info(label + ": " + (Files.exists(path) ? "存在" : "なし") + " -> " + path);
    }

    private static int launch(Roots roots, CommandRequest request, PluginContext context) throws IOException {
        if (!request.dryRun() && !request.confirmed()) throw new IllegalArgumentException("起動には --yes が必要です。");
        Path jar = roots.appRoot().resolve(request.value("launcher", "NicoCacheLauncher.jar"));
        if (!Files.isRegularFile(jar)) jar = roots.appRoot().resolve("NicoCache_nl.jar");
        if (!Files.isRegularFile(jar)) throw new IOException("NicoCache_nl.jarが見つかりません: " + jar);
        List<String> command = new ArrayList<>();
        command.add(request.value("java", context.config().get("tools.java", "java")));
        command.add("-jar"); command.add(jar.toString());
        if (request.flag("headless")) command.add("--headless");
        if (request.flag("start")) command.add("--start");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        Process process = new ProcessBuilder(command).directory(roots.appRoot().toFile()).inheritIO().start();
        context.log().info("NicoCache_nlを起動しました。PID=" + process.pid());
        return 0;
    }

    private static int stop(CommandRequest request, PluginContext context) throws InterruptedException {
        if (!request.confirmed()) throw new IllegalArgumentException("停止には --yes が必要です。");
        List<ProcessHandle> targets = ProcessHandle.allProcesses()
                .filter(handle -> handle.info().commandLine().orElse("").contains("NicoCache_nl.jar"))
                .toList();
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

    private static int createLinks(Roots roots, CommandRequest request, PluginContext context) throws IOException {
        if (!request.dryRun() && !request.confirmed()) throw new IllegalArgumentException("リンク作成には --yes が必要です。");
        List<LinkMapping> mappings = mappings(roots);
        int failed = 0;
        for (LinkMapping mapping : mappings) {
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
                    if (resolved.toAbsolutePath().normalize().equals(mapping.source().toAbsolutePath().normalize()) && !request.flag("force")) {
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
                context.log().error("シンボリックリンクを作成できません。権限またはファイルシステムを確認してください: " + exception.getMessage());
            }
        }
        return failed == 0 ? 0 : 1;
    }

    private static int buildExtensions(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        Path sourceRoot = Path.of(request.value("source", roots.sourceRoot().resolve("extensions").toString()));
        Path jar = roots.appRoot().resolve("NicoCache_nl.jar");
        if (!Files.isDirectory(sourceRoot)) throw new IOException("拡張ソースが見つかりません: " + sourceRoot);
        if (!Files.isRegularFile(jar)) throw new IOException("クラスパス用JARが見つかりません: " + jar);
        List<Path> sources;
        if (!request.value("file", "").isBlank()) {
            sources = List.of(Path.of(request.value("file", "")).toAbsolutePath().normalize());
        } else {
            try (var stream = Files.list(sourceRoot)) {
                sources = stream.filter(path -> path.toString().endsWith(".java"))
                        .filter(path -> !path.getFileName().toString().contains("sample"))
                        .sorted().toList();
            }
        }
        if (sources.isEmpty()) throw new IOException("コンパイル対象のJavaソースがありません。");
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("コンパイルには --yes が必要です。");
        Path temp = Files.createTempDirectory("filter-matome-extension-build-");
        int failures = 0;
        try {
            for (Path source : sources) {
                Path compileDir = Files.createTempDirectory(temp, "one-");
                List<String> command = List.of(request.value("javac", context.config().get("tools.javac", "javac")),
                        "-Xlint", "-classpath", jar + java.io.File.pathSeparator + sourceRoot,
                        "-d", compileDir.toString(), source.toString());
                if (request.dryRun()) {
                    context.log().info("DRY-RUN: " + ProcessRunner.format(command));
                    FileSafety.deleteTree(compileDir);
                    continue;
                }
                ProcessResult result = context.processes().run(command, sourceRoot, context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken());
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
                try (var generated = Files.list(compileDir)) {
                    List<Path> extra = generated.filter(path -> path.getFileName().toString().endsWith(".class"))
                            .filter(path -> !path.getFileName().toString().equals(className)).toList();
                    if (!extra.isEmpty()) {
                        failures++;
                        context.log().error("補助クラスが生成されたため安全のため配置しません: " + extra);
                        FileSafety.deleteTree(compileDir);
                        continue;
                    }
                }
                Files.copy(compiled, source.resolveSibling(className), StandardCopyOption.REPLACE_EXISTING);
                context.log().info("コンパイル成功: " + source.getFileName());
                FileSafety.deleteTree(compileDir);
            }
        } finally {
            FileSafety.deleteTree(temp);
        }
        return failures == 0 ? 0 : 1;
    }

    private static int javaVersion(CommandRequest request, PluginContext context) throws IOException, InterruptedException {
        for (String tool : List.of(request.value("java", context.config().get("tools.java", "java")),
                request.value("javac", context.config().get("tools.javac", "javac")))) {
            ProcessResult result = context.processes().capture(List.of(tool, "-version"), null);
            context.log().info(tool + " exit=" + result.exitCode() + "\n" + result.output().trim());
        }
        return 0;
    }

    private static int generateCertificates(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        Path caJar = roots.appRoot().resolve("NicoCacheCA.jar");
        Path targets = roots.appRoot().resolve("certificate-targets.txt");
        if (!Files.isRegularFile(caJar) || !Files.isRegularFile(targets)) {
            throw new IOException("NicoCacheCA.jarまたはcertificate-targets.txtが見つかりません。");
        }
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("証明書生成には --yes が必要です。");
        List<String> command = List.of(request.value("java", context.config().get("tools.java", "java")), "-jar", caJar.toString(),
                "--headless", "--targets-file=" + targets);
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, roots.appRoot(), context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken()).exitCode();
    }

    private static int certificate(String action, Roots roots, CommandRequest request, PluginContext context) throws Exception {
        if (!isWindows()) throw new IOException("証明書ストア操作はWindowsのcertutilに依存するため、このOSでは利用できません。");
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("証明書ストア変更には --yes が必要です。");
        Path cert = Files.isRegularFile(roots.dataRoot().resolve("certs/ca.cer"))
                ? roots.dataRoot().resolve("certs/ca.cer") : roots.appRoot().resolve("certs/ca.cer");
        if (action.equals("certificate-delete")) {
            List<String> command = List.of("certutil.exe", "-delstore", "ROOT", "NicoCache_nl CA");
            if (request.dryRun()) {
                context.log().info("DRY-RUN: " + ProcessRunner.format(command));
                return 0;
            }
            return context.processes().run(command, roots.appRoot(), context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken()).exitCode();
        }
        if (!Files.isRegularFile(cert)) throw new IOException("ca.cerが見つかりません: " + cert);
        List<String> add = List.of("certutil.exe", "-addstore", "ROOT", cert.toString());
        if (action.equals("certificate-renew")) {
            List<String> delete = List.of("certutil.exe", "-delstore", "ROOT", "NicoCache_nl CA");
            if (request.dryRun()) {
                context.log().info("DRY-RUN: " + ProcessRunner.format(delete));
                context.log().info("DRY-RUN: " + ProcessRunner.format(add));
                return 0;
            }
            ProcessResult deleted = context.processes().run(delete, roots.appRoot(), context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken());
            if (!deleted.succeeded()) context.log().warn("既存証明書の削除に失敗しました。追加を続行します。");
        } else if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(add));
            return 0;
        }
        return context.processes().run(add, roots.appRoot(), context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken()).exitCode();
    }

    private static int proxy(String action, CommandRequest request, PluginContext context) throws Exception {
        if (!isWindows()) throw new IOException("Windows Internet Settingsのレジストリ操作はこのOSでは利用できません。");
        String key = "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
        String url = request.value("proxy-url", "http://127.0.0.1:8080/proxy.pac");
        List<String> command = switch (action) {
            case "proxy-set" -> List.of("reg.exe", "ADD", key, "/f", "/v", "AutoConfigURL", "/t", "REG_SZ", "/d", url);
            case "proxy-remove" -> List.of("reg.exe", "DELETE", key, "/v", "AutoConfigURL", "/f");
            default -> List.of("reg.exe", "QUERY", key, "/v", "AutoConfigURL");
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

    private static int firefoxProxy(Roots roots, CommandRequest request, PluginContext context) throws IOException {
        Path base = firefoxProfilesBase();
        if (!Files.isDirectory(base)) throw new IOException("Firefoxプロファイルディレクトリが見つかりません: " + base);
        Path profile;
        try (var profiles = Files.list(base)) {
            profile = profiles.filter(Files::isDirectory)
                    .filter(path -> path.getFileName().toString().contains(".default"))
                    .findFirst().orElse(null);
        }
        if (profile == null) throw new IOException("Firefoxの既定プロファイルが見つかりません: " + base);
        Path userJs = profile.resolve("user.js");
        String addition = "user_pref(\"network.proxy.autoconfig_url\", \"" + request.value("proxy-url", "http://127.0.0.1:8080/proxy.pac") + "\");" + System.lineSeparator()
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
        if (Files.exists(userJs)) context.log().info("user.jsをバックアップしました: " + FileSafety.backup(userJs));
        Files.writeString(userJs, current + (current.endsWith(System.lineSeparator()) || current.isEmpty() ? "" : System.lineSeparator()) + addition);
        context.log().info("Firefoxプロキシ設定を追加しました。Firefox再起動後に反映されます: " + userJs);
        return 0;
    }

    private static int taskInstall(Roots roots, CommandRequest request, PluginContext context) throws Exception {
        if (!request.confirmed() && !request.dryRun()) throw new IllegalArgumentException("タスク登録には --yes が必要です。");
        Path launcher = roots.appRoot().resolve("NicoCacheLauncher.jar");
        if (!Files.isRegularFile(launcher)) throw new IOException("NicoCacheLauncher.jarが見つかりません: " + launcher);
        List<String> command = List.of(request.value("java", context.config().get("tools.java", "java")), "-jar", launcher.toString(),
                "--headless", "--task-install", "--task-name=NicoCache_nl");
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + ProcessRunner.format(command));
            return 0;
        }
        return context.processes().run(command, roots.appRoot(), context.log(), new jp.roflsunriz.filtermatome.toolbox.CancellationToken()).exitCode();
    }

    private static int openUrl(CommandRequest request, PluginContext context) throws Exception {
        if (request.flag("headless") || !Desktop.isDesktopSupported()) {
            throw new IOException("GUIブラウザーを開けないため、ヘッドレス実行ではopenを利用できません。");
        }
        String url = request.value("url", "https://nicocache.jpn.org/");
        Desktop.getDesktop().browse(URI.create(url));
        context.log().info("ブラウザーで開きました: " + url);
        return 0;
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private static Path firefoxProfilesBase() {
        String appData = System.getenv("APPDATA");
        if (isWindows() && appData != null && !appData.isBlank()) return Path.of(appData, "Mozilla", "Firefox", "Profiles");
        return Path.of(System.getProperty("user.home"), ".mozilla", "firefox");
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

    private static List<LinkMapping> mappings(Roots roots) {
        String[][] values = {
                {"scripts", "scripts"},
                {"local/background-images", "local/background-images"},
                {"local/features", "local/features"},
                {"local/images", "local/images"},
                {"local/mime.types", "local/mime.types"},
                {"nlFilters/100_features.txt", "nlFilters/100_features.txt"},
                {"nlFilters/101_disable_official_function.txt", "nlFilters/101_disable_official_function.txt"},
                {"nlFilters/105_premium_hide.txt", "nlFilters/105_premium_hide.txt"},
                {"local/features/dist/features.js", "local/list.js"},
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
        for (String[] value : values) {
            result.add(new LinkMapping(roots.sourceRoot().resolve(value[0]), roots.dataRoot().resolve(value[1])));
        }
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
        private final JCheckBox force = new JCheckBox("既存リンクを再作成");
        private final JTextArea log = new JTextArea();

        private NicoCachePanel(NicoCachePlugin plugin, PluginContext context) {
            super(new BorderLayout(8, 8));
            this.plugin = plugin; this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            sourceRoot.setText(context.paths().repoRoot().toString());
            build();
        }

        private void build() {
            JPanel fields = new JPanel(new java.awt.GridLayout(3, 2, 5, 5));
            fields.setBorder(BorderFactory.createTitledBorder("パス（空欄は自動解決）"));
            fields.add(new JLabel("アプリルート")); fields.add(appRoot);
            fields.add(new JLabel("データルート")); fields.add(dataRoot);
            fields.add(new JLabel("ソースルート")); fields.add(sourceRoot);
            JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT));
            addAction(buttons, "診断", "diagnose"); addAction(buttons, "起動", "launch"); addAction(buttons, "停止", "stop");
            addAction(buttons, "リンク", "links"); addAction(buttons, "拡張ビルド", "build");
            buttons.add(dryRun); buttons.add(force);
            log.setEditable(false); log.setLineWrap(true); log.setWrapStyleWord(true);
            context.log().addListener(line -> javax.swing.SwingUtilities.invokeLater(() -> {
                log.append(line + System.lineSeparator());
                log.setCaretPosition(log.getDocument().getLength());
            }));
            add(fields, BorderLayout.NORTH); add(new JScrollPane(log), BorderLayout.CENTER); add(buttons, BorderLayout.SOUTH);
        }

        private void addAction(JPanel panel, String label, String action) {
            JButton button = new JButton(label);
            button.addActionListener(event -> runAction(action));
            panel.add(button);
        }

        private void runAction(String action) {
            boolean destructive = action.equals("stop") || action.equals("links") || action.equals("build");
            if (destructive && !dryRun.isSelected() && javax.swing.JOptionPane.showConfirmDialog(this,
                    "この操作は外部ファイルやプロセスに影響します。続行しますか？", "確認",
                    javax.swing.JOptionPane.YES_NO_OPTION) != javax.swing.JOptionPane.YES_OPTION) return;
            Map<String, String> values = new java.util.HashMap<>();
            values.put("app-root", appRoot.getText()); values.put("data-root", dataRoot.getText()); values.put("source-root", sourceRoot.getText());
            values.put("force", Boolean.toString(force.isSelected())); values.put("headless", "true"); values.put("start", "true");
            CommandRequest request = new CommandRequest(action, List.of(), values, false, force.isSelected(), dryRun.isSelected(), true, null);
            new SwingWorker<Integer, Void>() {
                @Override protected Integer doInBackground() throws Exception { return plugin.run(request, context); }
                @Override protected void done() { try { context.log().info(action + "終了: exit=" + get()); }
                    catch (Exception exception) { context.log().error(action + "失敗: " + exception.getMessage()); } }
            }.execute();
        }
    }
}
