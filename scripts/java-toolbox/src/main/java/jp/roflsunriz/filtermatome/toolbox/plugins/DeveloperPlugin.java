package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import java.awt.FlowLayout;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/** リポジトリ補助スクリプトのうち、GUI化できる安全な操作をまとめる。 */
public final class DeveloperPlugin implements ToolPlugin {
    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("developer", "開発補助", "リポジトリリンク作成と依存関係診断", true, true);
    }

    @Override
    public String readme() {
        return "開発補助\n\n"
                + "create-claude-link.ps1の安全なJava版です。既存の通常ファイルは削除せず、\n"
                + "シンボリックリンクの再作成には --force --yes を要求します。\n"
                + "mkdocs_hooks.pyはMkDocsのPythonフックとして残しますが、Java Toolbox本体の実行にはPython依存はありません。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JTextField target = new JTextField("CLAUDE.md", 16);
        JButton create = new JButton("リンク作成");
        create.addActionListener(event -> {
            try {
                createLink(context.paths().repoRoot(), "AGENTS.md", target.getText(), false, context);
            } catch (Exception exception) {
                context.log().error("リンク作成に失敗しました: " + exception.getMessage());
            }
        });
        panel.add(new JLabel("AGENTS.md ->")); panel.add(target); panel.add(create);
        return panel;
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        String action = request.action().isBlank() ? "diagnose" : request.action().toLowerCase();
        return switch (action) {
            case "create-claude-link", "link" -> {
                String source = request.value("source", "AGENTS.md");
                String target = request.value("link-name", "CLAUDE.md");
                yield createLink(context.paths().repoRoot(), source, target, request.dryRun(), context,
                        request.flag("force"), request.confirmed());
            }
            case "diagnose" -> {
                context.log().info("Java ToolboxはPython依存なしで動作します。");
                context.log().info("MkDocsフックは既存のscripts/mkdocs_hooks.pyをMkDocsから利用してください。");
                yield 0;
            }
            default -> throw new IllegalArgumentException("未対応の開発補助アクションです: " + action);
        };
    }

    private static int createLink(Path root, String sourceName, String targetName, boolean dryRun,
                                  PluginContext context) throws IOException {
        return createLink(root, sourceName, targetName, dryRun, context, false, true);
    }

    private static int createLink(Path root, String sourceName, String targetName, boolean dryRun,
                                  PluginContext context, boolean force, boolean confirmed) throws IOException {
        Path source = root.resolve(sourceName).normalize();
        Path link = root.resolve(targetName).normalize();
        if (!source.startsWith(root) || !link.startsWith(root)) throw new IOException("ルート外のパスは指定できません。");
        if (!Files.exists(source)) throw new IOException("リンク元がありません: " + source);
        if (!dryRun && !confirmed) throw new IOException("リンク作成には --yes が必要です。");
        if (Files.exists(link) || Files.isSymbolicLink(link)) {
            if (!Files.isSymbolicLink(link)) throw new IOException("通常ファイルを削除せず停止しました: " + link);
            Path current = Files.readSymbolicLink(link);
            Path resolved = current.isAbsolute() ? current : link.getParent().resolve(current);
            if (resolved.toAbsolutePath().normalize().equals(source.toAbsolutePath().normalize()) && !force) {
                context.log().info("既に正しいリンクです: " + link);
                return 0;
            }
            if (!force) throw new IOException("異なるリンクがあります。--force --yesで再作成できます: " + link);
            if (!confirmed && !dryRun) throw new IOException("リンク再作成には --yes が必要です。");
            if (!dryRun) Files.delete(link);
        }
        Path relative = link.getParent().relativize(source);
        if (dryRun) {
            context.log().info("DRY-RUN: " + link + " -> " + relative);
            return 0;
        }
        Files.createSymbolicLink(link, relative);
        context.log().info("リンクを作成しました: " + link + " -> " + relative);
        return 0;
    }
}
