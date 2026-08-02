package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** 開発用シンボリックリンクの既定値、定義、実行をまとめるサービス。 */
final class DeveloperSymlinkService {
    private static final String TEST_PLATFORM_PROPERTY = "filterMatome.toolbox.test.platform";
    private static final Path WINDOWS_DEFAULT_SOURCE = Path.of("C:\\filter-matome");
    private static final List<LinkDefinition> ALL_LINKS = List.of(
            new LinkDefinition("scripts", "scripts"),
            new LinkDefinition("local/background-images", "local/background-images"),
            new LinkDefinition("local/features", "local/features"),
            new LinkDefinition("local/images", "local/images"),
            new LinkDefinition("local/mime.types", "local/mime.types"),
            new LinkDefinition("nlFilters/100_features.txt", "nlFilters/100_features.txt"),
            new LinkDefinition("nlFilters/101_disable_official_function.txt", "nlFilters/101_disable_official_function.txt"),
            new LinkDefinition("nlFilters/105_premium_hide.txt", "nlFilters/105_premium_hide.txt"),
            new LinkDefinition("extensions/CommentFilterLogger.class", "extensions/CommentFilterLogger.class"),
            new LinkDefinition("extensions/CustomCacheReturner.class", "extensions/CustomCacheReturner.class"),
            new LinkDefinition("extensions/downloadThruFFmpeg.class", "extensions/downloadThruFFmpeg.class"),
            new LinkDefinition("extensions/ExtUtil.class", "extensions/ExtUtil.class"),
            new LinkDefinition("extensions/FilterMatomeCacheControl.class", "extensions/FilterMatomeCacheControl.class"),
            new LinkDefinition("extensions/FilterMatomeSeriesAlerts.class", "extensions/FilterMatomeSeriesAlerts.class"),
            new LinkDefinition("extensions/NicochartInfoProxy.class", "extensions/NicochartInfoProxy.class"),
            new LinkDefinition("extensions/nlGpac.class", "extensions/nlGpac.class"),
            new LinkDefinition("local/features/dist/features.js", "local/list.js"));

    private DeveloperSymlinkService() {
    }

    static Path defaultSourceRoot(PluginContext context) {
        return defaultSourceRoot(platformName(), context.paths().repoRoot());
    }

    static Path defaultSourceRoot(String platform, Path repositoryRoot) {
        if (isWindows(platform)) {
            return WINDOWS_DEFAULT_SOURCE;
        }
        return repositoryRoot.toAbsolutePath().normalize();
    }

    static Path defaultTargetRoot() {
        return defaultTargetRoot(platformName(), System.getenv("LOCALAPPDATA"),
                System.getenv("XDG_CONFIG_HOME"), System.getProperty("user.home", "."));
    }

    static Path defaultTargetRoot(String platform, String localAppData, String xdgConfigHome, String userHome) {
        return ConfigEditorPlugin.defaultConfigPath(platform, localAppData, xdgConfigHome, userHome)
                .toAbsolutePath().normalize().getParent();
    }

    static Path defaultListJsTarget(PluginContext context) {
        return defaultSourceRoot(context).resolve("local/features/dist/features.js")
                .toAbsolutePath().normalize();
    }

    static List<LinkDefinition> allLinkDefinitions() {
        return ALL_LINKS;
    }

    static int createAll(CommandRequest request, PluginContext context) throws IOException {
        requireConfirmation(request);
        Path sourceRoot = requestedRoot(request, defaultSourceRoot(context),
                "source-root", "source");
        Path targetRoot = requestedRoot(request, defaultTargetRoot(),
                "target-root", "data-root");
        context.log().info("リンク元ルート: " + sourceRoot);
        context.log().info("リンク先ルート: " + targetRoot);

        if (!Files.isDirectory(targetRoot)) {
            if (!request.dryRun()) {
                throw new IOException("リンク先ルートがありません: " + targetRoot);
            }
            context.log().warn("リンク先ルートがないため、dry-runのみ続行します: " + targetRoot);
        }

        List<LinkPlan> plans = new ArrayList<>();
        for (LinkDefinition definition : ALL_LINKS) {
            plans.add(new LinkPlan(sourceRoot.resolve(definition.source()).normalize(),
                    targetRoot.resolve(definition.link()).normalize()));
        }
        return processPlans(plans, request, context, false);
    }

    static int createListJs(CommandRequest request, PluginContext context) throws IOException {
        requireConfirmation(request);
        Path sourceRoot = requestedRoot(request, defaultSourceRoot(context),
                "source-root", "source");
        Path targetRoot = requestedRoot(request, defaultTargetRoot(),
                "target-root", "data-root");
        String targetValue = firstValue(request, "target", "target-file");
        if (targetValue == null && !request.inputs().isEmpty()) {
            targetValue = request.inputs().get(0);
        }
        Path target = targetValue == null
                ? sourceRoot.resolve("local/features/dist/features.js")
                : resolvePath(targetValue, sourceRoot);
        String linkDirectoryValue = firstValue(request, "link-dir", "linkdirectory", "link-directory");
        Path linkDirectory = linkDirectoryValue == null
                ? targetRoot.resolve("local")
                : resolvePath(linkDirectoryValue, targetRoot);

        if (!Files.isRegularFile(target)) {
            throw new IOException("リンク元のJavaScriptがありません: " + target);
        }
        if (!Files.isDirectory(linkDirectory)) {
            if (!request.dryRun()) {
                throw new IOException("list.jsのリンク先フォルダーがありません: " + linkDirectory);
            }
            context.log().warn("list.jsのリンク先フォルダーがないため、dry-runのみ続行します: " + linkDirectory);
        }

        Path listLink = linkDirectory.resolve("list.js").normalize();
        List<LinkPlan> plans = new ArrayList<>();
        plans.add(new LinkPlan(target, listLink));

        Path targetMap = target.resolveSibling(target.getFileName() + ".map");
        if (Files.exists(targetMap)) {
            plans.add(new LinkPlan(targetMap, linkDirectory.resolve("list.js.map").normalize()));
        } else {
            context.log().info("mapファイルがないためlist.js.mapは変更しません: " + targetMap);
        }
        return processPlans(plans, request, context, false);
    }

    static int createSingleLink(CommandRequest request, PluginContext context) throws IOException {
        requireConfirmation(request);
        Path root = context.paths().repoRoot().toAbsolutePath().normalize();
        Path source = resolvePath(request.value("source", "AGENTS.md"), root);
        Path link = resolvePath(request.value("link-name", "CLAUDE.md"), root);
        if (!source.startsWith(root) || !link.startsWith(root)) {
            throw new IOException("ルート外のパスは指定できません。");
        }
        if (!Files.exists(source)) {
            throw new IOException("リンク元がありません: " + source);
        }
        processPlan(new LinkPlan(source, link), request, context, true);
        return 0;
    }

    private static void requireConfirmation(CommandRequest request) {
        if (!request.dryRun() && !request.confirmed()) {
            throw new IllegalArgumentException("シンボリックリンク作成には --yes が必要です。");
        }
    }

    private static int processPlans(List<LinkPlan> plans, CommandRequest request,
                                    PluginContext context, boolean rejectRegularFile) {
        int failed = 0;
        for (LinkPlan plan : plans) {
            if (!Files.exists(plan.source())) {
                context.log().warn("リンク元がないためスキップ: " + plan.source());
                continue;
            }
            try {
                processPlan(plan, request, context, rejectRegularFile);
            } catch (IOException | UnsupportedOperationException | SecurityException exception) {
                failed++;
                context.log().error("シンボリックリンクを作成できません: " + plan.link()
                        + " -> " + plan.source() + " / " + exception.getMessage());
            }
        }
        return failed == 0 ? 0 : 1;
    }

    private static void processPlan(LinkPlan plan, CommandRequest request,
                                    PluginContext context, boolean rejectRegularFile) throws IOException {
        Path source = plan.source().toAbsolutePath().normalize();
        Path link = plan.link().toAbsolutePath().normalize();
        if (request.dryRun()) {
            context.log().info("DRY-RUN: " + link + " -> " + source);
            return;
        }
        Path parent = link.getParent();
        if (parent == null || !Files.isDirectory(parent)) {
            throw new IOException("リンク先の親フォルダーがありません: " + parent);
        }

        boolean force = request.flag("force") || request.overwrite();
        if (Files.exists(link, LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(link)) {
            if (!Files.isSymbolicLink(link)) {
                if (rejectRegularFile) {
                    throw new IOException("通常ファイルを削除せず停止しました: " + link);
                }
                context.log().warn("通常ファイルまたはフォルダーを削除せずスキップ: " + link);
                return;
            }
            Path current = Files.readSymbolicLink(link);
            Path resolved = current.isAbsolute() ? current : link.getParent().resolve(current);
            if (resolved.toAbsolutePath().normalize().equals(source) && !force) {
                context.log().info("既に正しいリンクです: " + link);
                return;
            }
            if (!force) {
                context.log().warn("異なるシンボリックリンクがあるためスキップ（--forceで再作成）: " + link);
                return;
            }
            Files.delete(link);
        }

        Path symbolicTarget;
        try {
            symbolicTarget = link.getParent().relativize(source);
        } catch (IllegalArgumentException exception) {
            symbolicTarget = source;
        }
        Files.createSymbolicLink(link, symbolicTarget);
        context.log().info("リンクを作成しました: " + link + " -> " + symbolicTarget);
    }

    private static Path requestedRoot(CommandRequest request, Path fallback, String... keys) {
        String value = firstValue(request, keys);
        if (value == null) {
            return fallback.toAbsolutePath().normalize();
        }
        return Path.of(value).toAbsolutePath().normalize();
    }

    private static Path resolvePath(String value, Path base) {
        Path path = Path.of(value.trim());
        return (path.isAbsolute() ? path : base.resolve(path)).toAbsolutePath().normalize();
    }

    private static String firstValue(CommandRequest request, String... keys) {
        for (String key : keys) {
            String value = request.values().get(key);
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static String platformName() {
        String override = System.getProperty(TEST_PLATFORM_PROPERTY, "").trim();
        return override.isBlank() ? System.getProperty("os.name", "") : override;
    }

    private static boolean isWindows(String platform) {
        return platform != null && platform.toLowerCase(Locale.ROOT).contains("win");
    }

    record LinkDefinition(String source, String link) {
    }

    private record LinkPlan(Path source, Path link) {
    }
}
