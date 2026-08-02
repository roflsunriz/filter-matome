package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CancellationToken;
import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.FileSafety;
import jp.roflsunriz.filtermatome.toolbox.Json;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/** GitHub Releases APIを使う依存なしアップデータ。 */
public final class UpdaterPlugin implements ToolPlugin {
    private static final String API_URL = "https://api.github.com/repos/roflsunriz/filter-matome/releases/latest";
    private static final String DEFAULT_TARGET = "filter-matome-downloads";

    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("updater", "自動アップデート", "GitHub Releasesの最新安定版を安全にダウンロード", true, true);
    }

    @Override
    public String readme() {
        return "自動アップデート\n\n"
                + "GitHub Releases APIを使用し、ETagによる304判定を行います。\n"
                + "アセット名はパス区切り文字を拒否し、.partへ書き込んでから原子的に確定します。\n"
                + "既存ファイルは既定でスキップし、--overwrite指定時だけバックアップ後に上書きします。\n"
                + "トークンは環境変数 GITHUB_TOKEN を優先し、ログへ出力しません。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new UpdaterPanel(this, context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        String action = request.action().isBlank() ? "check" : request.action().toLowerCase();
        if (!action.equals("check") && !action.equals("download")) {
            throw new IllegalArgumentException("未対応の更新アクションです: " + action);
        }
        Path target = request.output() != null
                ? request.output().toAbsolutePath().normalize()
                : Path.of(request.value("target", context.config().get("updater.targetDir", defaultTarget()))).toAbsolutePath().normalize();
        boolean overwrite = request.overwrite();
        return checkOnce(context, target, overwrite, request.dryRun(), new CancellationToken());
    }

    private int checkOnce(PluginContext context, Path target, boolean overwrite, boolean dryRun,
                          CancellationToken token) throws Exception {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
        String tokenValue = resolveToken(context);
        HttpRequest.Builder requestBuilder = HttpRequest.newBuilder(URI.create(API_URL))
                .timeout(Duration.ofSeconds(30))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", "filter-matome-toolbox/0.1")
                .GET();
        String etag = context.config().get("updater.etag", "");
        if (!etag.isBlank()) requestBuilder.header("If-None-Match", etag);
        if (!tokenValue.isBlank()) requestBuilder.header("Authorization", "Bearer " + tokenValue);

        context.log().info("GitHubの最新安定版を確認します。");
        HttpResponse<String> response = client.send(requestBuilder.build(), HttpResponse.BodyHandlers.ofString());
        context.config().set("updater.lastChecked", Instant.now().toString());
        if (response.statusCode() == 304) {
            context.config().save();
            context.log().info("変更はありません（HTTP 304）。");
            return 0;
        }
        if (response.statusCode() != 200) {
            context.config().save();
            throw new IOException("GitHub APIがHTTP " + response.statusCode() + "を返しました。");
        }
        response.headers().firstValue("ETag").ifPresent(value -> context.config().set("updater.etag", value));
        Map<String, Object> release = Json.object(Json.parse(response.body()));
        if (Json.bool(release.get("draft"), false) || Json.bool(release.get("prerelease"), false)) {
            context.config().save();
            context.log().info("安定版リリースが見つかりませんでした。");
            return 0;
        }
        String releaseName = Json.string(release.get("name"), Json.string(release.get("tag_name"), "unknown"));
        String releaseId = Json.numberText(release.get("id"), "");
        context.log().info("最新リリース: " + releaseName);
        if (dryRun) {
            for (Object rawAsset : Json.array(release.get("assets"))) {
                Map<String, Object> asset = Json.object(rawAsset);
                context.log().info("DRY-RUN: " + safeAssetName(Json.string(asset.get("name"), "")));
            }
            context.config().save();
            return 0;
        }
        Files.createDirectories(target);
        int failures = 0;
        for (Object rawAsset : Json.array(release.get("assets"))) {
            if (token.isCancelled()) return 130;
            Map<String, Object> asset = Json.object(rawAsset);
            String name = safeAssetName(Json.string(asset.get("name"), ""));
            String url = Json.string(asset.get("browser_download_url"), "");
            if (name.isBlank() || url.isBlank()) {
                context.log().warn("不完全なアセットをスキップしました。");
                continue;
            }
            try {
                download(client, url, target.resolve(name), overwrite, token, context, tokenValue);
            } catch (Exception exception) {
                failures++;
                context.log().error("ダウンロード失敗: " + name + " / " + exception.getMessage());
            }
        }
        context.config().set("updater.lastReleaseId", releaseId);
        context.config().save();
        return failures == 0 ? 0 : 1;
    }

    private void download(HttpClient client, String url, Path target, boolean overwrite, CancellationToken token,
                           PluginContext context, String tokenValue) throws Exception {
        if (Files.exists(target) && !overwrite) {
            context.log().warn("既存ファイルをスキップ（--overwriteで上書き可能）: " + target.getFileName());
            return;
        }
        if (overwrite && Files.exists(target)) {
            context.log().info("既存アセットをバックアップします: " + FileSafety.backup(target));
        }
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofMinutes(5))
                .header("Accept", "application/octet-stream")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("User-Agent", "filter-matome-toolbox/0.1")
                .GET();
        if (!tokenValue.isBlank()) request.header("Authorization", "Bearer " + tokenValue);
        HttpResponse<InputStream> response = client.send(request.build(), HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200) {
            response.body().close();
            throw new IOException("HTTP " + response.statusCode());
        }
        Path part = target.resolveSibling(target.getFileName() + ".part");
        try (InputStream input = response.body(); var output = Files.newOutputStream(part)) {
            byte[] buffer = new byte[256 * 1024];
            int read;
            while ((read = input.read(buffer)) >= 0) {
                if (token.isCancelled()) throw new IOException("キャンセルされました");
                if (read > 0) output.write(buffer, 0, read);
            }
        } catch (Exception exception) {
            Files.deleteIfExists(part);
            throw exception;
        }
        try {
            Files.move(part, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(part, target, StandardCopyOption.REPLACE_EXISTING);
        }
        context.log().info("ダウンロード完了: " + target.getFileName());
    }

    private static String safeAssetName(String name) {
        if (name == null || name.isBlank()) return "";
        Path path = Path.of(name);
        if (path.getNameCount() != 1 || name.contains("/") || name.contains("\\") || name.equals(".") || name.equals("..")) {
            return "";
        }
        return name;
    }

    private static String resolveToken(PluginContext context) {
        String env = System.getenv("GITHUB_TOKEN");
        if (env != null && !env.isBlank()) return env.trim();
        return context.config().get("updater.githubToken", "").trim();
    }

    private static String defaultTarget() {
        return Path.of(System.getProperty("user.home"), DEFAULT_TARGET).toString();
    }

    private static final class UpdaterPanel extends JPanel {
        private final UpdaterPlugin plugin;
        private final PluginContext context;
        private final JTextField target = new JTextField();
        private final JTextField interval = new JTextField("1440", 6);
        private final JTextArea log = new JTextArea();
        private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "filter-matome-updater");
            thread.setDaemon(true);
            return thread;
        });
        private volatile boolean running;
        private volatile ScheduledFuture<?> scheduled;

        private UpdaterPanel(UpdaterPlugin plugin, PluginContext context) {
            super(new BorderLayout(8, 8));
            this.plugin = plugin;
            this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            target.setText(context.config().get("updater.targetDir", defaultTarget()));
            build();
        }

        private void build() {
            JPanel fields = new JPanel(new FlowLayout(FlowLayout.LEFT));
            fields.add(new JLabel("保存先")); fields.add(target);
            fields.add(new JLabel("間隔（分）")); fields.add(interval);
            JButton save = new JButton("設定保存"); save.addActionListener(event -> save());
            JButton check = new JButton("今すぐ確認"); check.addActionListener(event -> check());
            JButton start = new JButton("監視開始"); start.addActionListener(event -> start());
            JButton stop = new JButton("停止"); stop.addActionListener(event -> stop());
            fields.add(save); fields.add(check); fields.add(start); fields.add(stop);
            log.setEditable(false); log.setLineWrap(true); log.setWrapStyleWord(true);
            context.log().addListener(line -> javax.swing.SwingUtilities.invokeLater(() -> {
                log.append(line + System.lineSeparator());
                log.setCaretPosition(log.getDocument().getLength());
            }));
            add(fields, BorderLayout.NORTH);
            add(new JScrollPane(log), BorderLayout.CENTER);
        }

        private void save() {
            try {
                int minutes = Math.max(1, Integer.parseInt(interval.getText().trim()));
                context.config().set("updater.targetDir", Path.of(target.getText().trim()).toAbsolutePath().toString());
                context.config().set("updater.intervalMinutes", Integer.toString(minutes));
                context.config().save();
                context.log().info("アップデータ設定を保存しました。");
            } catch (Exception exception) {
                context.log().error("アップデータ設定を保存できません: " + exception.getMessage());
            }
        }

        private void check() {
            save();
            new SwingWorker<Integer, Void>() {
                @Override protected Integer doInBackground() throws Exception {
                    CommandRequest request = new CommandRequest("check", List.of(), Map.of(), false, false, false, true,
                            Path.of(target.getText().trim()));
                    return plugin.run(request, context);
                }
                @Override protected void done() {
                    try { context.log().info("更新確認終了: exit=" + get()); }
                    catch (Exception exception) { context.log().error("更新確認失敗: " + exception.getMessage()); }
                }
            }.execute();
        }

        private void start() {
            if (running) return;
            save(); running = true;
            long delay = Math.max(1, context.config().getInt("updater.intervalMinutes", 1440));
            scheduled = scheduler.scheduleWithFixedDelay(this::check, 0, delay, TimeUnit.MINUTES);
            context.log().info("更新監視を開始しました。");
        }

        private void stop() {
            running = false;
            if (scheduled != null) scheduled.cancel(false);
            context.log().info("更新監視を停止しました。");
        }
    }
}
