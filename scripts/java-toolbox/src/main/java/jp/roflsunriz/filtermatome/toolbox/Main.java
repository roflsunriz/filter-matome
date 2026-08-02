package jp.roflsunriz.filtermatome.toolbox;

import java.util.Locale;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public final class Main {
    private Main() {
    }

    public static void main(String[] args) {
        CliOptions options;
        try {
            options = CliOptions.parse(args);
        } catch (IllegalArgumentException exception) {
            System.err.println("引数エラー: " + exception.getMessage());
            printUsage();
            System.exit(2);
            return;
        }

        if (options.headless()) {
            System.setProperty("java.awt.headless", "true");
        }
        try {
            AppPaths paths = AppPaths.discover(options);
            AppConfig config = new AppConfig(paths.configFile());
            LogBus log = new LogBus();
            ProcessRunner processes = new ProcessRunner();
            PluginContext context = new PluginContext(paths, config, processes, log);
            try (PluginManager manager = new PluginManager(context)) {
                manager.discover();
                if (options.help()) {
                    printUsage();
                    return;
                }
                if (options.listPlugins()) {
                    for (ToolPlugin plugin : manager.all()) {
                        PluginDescriptor descriptor = plugin.descriptor();
                        System.out.println(descriptor.id() + "\t" + descriptor.name() + "\t" + descriptor.description());
                    }
                    return;
                }
                if (options.selfTest()) {
                    runSelfTest(context, manager);
                    return;
                }
                if (options.guiSmoke()) {
                    MainWindow window = new MainWindow(manager, context);
                    if (window.tabCount() != manager.all().size()) {
                        throw new IllegalStateException("GUIタブ数とプラグイン数が一致しません。");
                    }
                    window.close();
                    context.log().info("GUIスモーク構築に成功しました。");
                    return;
                }
                if (options.headless()) {
                    if (options.plugin() == null || options.plugin().isBlank()) {
                        throw new IllegalArgumentException("ヘッドレス実行では --plugin が必要です。");
                    }
                    int exitCode = manager.run(options.plugin(), options.request());
                    if (exitCode != 0) {
                        System.exit(exitCode);
                    }
                    return;
                }
                MainWindow window = new MainWindow(manager, context);
                window.show();
            }
        } catch (Exception exception) {
            System.err.println("エラー: " + exception.getMessage());
            if (Boolean.getBoolean("filterMatome.toolbox.debug")) {
                exception.printStackTrace(System.err);
            }
            System.exit(1);
        }
    }

    private static void runSelfTest(PluginContext context, PluginManager manager) throws Exception {
        if (!context.paths().dataDir().toFile().canWrite()) {
            throw new IllegalStateException("データディレクトリへ書き込めません: " + context.paths().dataDir());
        }
        if (manager.all().isEmpty()) {
            throw new IllegalStateException("プラグインが1件も見つかりません。");
        }
        CliOptions parsed = CliOptions.parse(new String[]{"--headless", "--plugin=media", "--action=hls",
                "--input", "file with spaces.mp4", "--dry-run"});
        check("media".equals(parsed.plugin()), "CLIのインライン引数解析に失敗しました。");
        check("hls".equals(parsed.action()), "CLIのaction解析に失敗しました。");
        check(parsed.inputs().size() == 1, "CLIの入力パス解析に失敗しました。");

        Map<String, Object> json = Json.object(Json.parse("{\"data\":{\"title\":\"テスト\"},\"ok\":true}"));
        check("テスト".equals(Json.string(Json.object(json.get("data")).get("title"), "")), "JSON解析に失敗しました。");

        Path temp = Files.createTempDirectory(context.paths().dataDir(), "self-test-");
        try {
            Path properties = temp.resolve("config.properties");
            PropertiesDocument document = PropertiesDocument.load(properties);
            document.set("test.key", "value", "テスト設定");
            check(document.save() == null, "新規propertiesの保存結果が不正です。");
            document.set("test.key", "updated", "テスト設定");
            check(document.save() != null, "既存propertiesのバックアップが作成されませんでした。");
            PropertiesDocument loaded = PropertiesDocument.load(properties);
            check("updated".equals(loaded.value("test.key")), "propertiesの再読込に失敗しました。");
        } finally {
            FileSafety.deleteTree(temp);
        }
        context.log().info("自己診断に成功しました。プラグイン数: " + manager.all().size());
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private static void printUsage() {
        System.out.println("filter-matome-toolbox");
        System.out.println("GUI:       java -jar filter-matome-toolbox-0.1.0-SNAPSHOT.jar");
        System.out.println("一覧:      java -jar ... --list-plugins");
        System.out.println("ヘッドレス: java -jar ... --headless --plugin media --action hls --input movie.mp4 --dry-run");
        System.out.println("共通引数:  --data-dir PATH --plugins-dir PATH --repo-root PATH --output PATH");
        System.out.println("安全引数:  --recursive --overwrite --dry-run --yes");
        System.out.println("現在のロケール: " + Locale.getDefault());
    }
}
