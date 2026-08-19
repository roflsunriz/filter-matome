package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.SwingWorker;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** リポジトリリンク作成と依存関係診断をまとめる開発補助プラグイン。 */
public final class DeveloperPlugin implements ToolPlugin {
    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("developer", "開発補助",
                "リポジトリリンク作成と依存関係診断", true, true);
    }

    @Override
    public String readme() {
        return "開発補助\n\n"
                + "create-claude-link.ps1、create-all-symlinks.ps1相当の機能を、\n"
                + "GUIとヘッドレスで共通利用できます。既定のソースはWindowsでは C:\\filter-matome、\n"
                + "Linuxでは現在のリポジトリ、macOSでは現在のリポジトリです。既定のリンク先は\n"
                + "Windowsでは %LOCALAPPDATA%/NicoCache_nl、Linuxでは ~/.config/NicoCache_nl、\n"
                + "macOSでは ~/Library/Application Support/NicoCache_nl です。\n\n"
                + "--action links は scripts、local、nlFilters、extensionsを一括でリンクします。\n"
                + "通常ファイルは削除せず、既存リンクの再作成には --force、\n"
                + "実作成には --yes、事前確認には --dry-run を指定してください。\n\n"
                + "例:\n"
                + "java -jar matome-toolbox.jar --headless --plugin developer --action links --dry-run\n"
                + "\nmkdocs_hooks.pyはMkDocsのPythonフックとして残しますが、matome-toolbox本体の実行にはPython依存はありません。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new DeveloperPanel(context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        String action = request.action().isBlank() ? "diagnose"
                : request.action().toLowerCase(Locale.ROOT);
        return switch (action) {
            case "create-claude-link", "link" -> DeveloperSymlinkService.createSingleLink(request, context);
            case "links", "create-links", "symlinks", "create-all-symlinks", "all-links" ->
                    DeveloperSymlinkService.createAll(request, context);
            case "diagnose", "check" -> {
                context.log().info("matome-toolboxはPython依存なしで動作します。");
                context.log().info("既定のリンク元: " + DeveloperSymlinkService.defaultSourceRoot(context));
                context.log().info("既定のリンク先: " + DeveloperSymlinkService.defaultTargetRoot());
                context.log().info("MkDocsフックは既存のscripts/mkdocs_hooks.pyをMkDocsから利用してください。");
                yield 0;
            }
            default -> throw new IllegalArgumentException("未対応の開発補助アクションです: " + action);
        };
    }

    /** GUIとテストから、現在のOSに対応した既定リンク先を確認できるようにする。 */
    public static Path defaultTargetRoot() {
        return DeveloperSymlinkService.defaultTargetRoot();
    }

    private static final class DeveloperPanel extends JPanel {
        private final PluginContext context;
        private final JTextField sourceRoot = new JTextField();
        private final JTextField targetRoot = new JTextField();
        private final JTextField claudeLinkName = new JTextField("CLAUDE.md");
        private final JCheckBox dryRun = new JCheckBox("ドライラン", true);
        private final JCheckBox force = new JCheckBox("既存リンクを再作成");

        private DeveloperPanel(PluginContext context) {
            super(new BorderLayout(8, 8));
            this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            sourceRoot.setText(DeveloperSymlinkService.defaultSourceRoot(context).toString());
            targetRoot.setText(DeveloperSymlinkService.defaultTargetRoot().toString());
            sourceRoot.setName("developer-source-root");
            targetRoot.setName("developer-target-root");
            claudeLinkName.setName("developer-claude-link-name");
            dryRun.setName("developer-dry-run");
            force.setName("developer-force");
            build();
        }

        private void build() {
            JPanel fields = new JPanel(new GridBagLayout());
            fields.setBorder(BorderFactory.createTitledBorder("シンボリックリンクのパス"));
            addField(fields, 0, "Source", sourceRoot);
            addField(fields, 1, "Target", targetRoot);
            addField(fields, 2, "CLAUDE.mdのリンク名", claudeLinkName);

            JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT));
            addAction(actions, "一括リンク", "developer-action-links", "links");
            addAction(actions, "CLAUDE.mdリンク", "developer-action-claude", "link");
            actions.add(dryRun);
            actions.add(force);

            JPanel content = new JPanel(new BorderLayout(8, 8));
            content.add(fields, BorderLayout.NORTH);
            content.add(actions, BorderLayout.CENTER);
            add(new JScrollPane(content), BorderLayout.CENTER);
        }

        private void addField(JPanel panel, int row, String label, JTextField field) {
            GridBagConstraints labelConstraints = new GridBagConstraints();
            labelConstraints.gridx = 0;
            labelConstraints.gridy = row;
            labelConstraints.anchor = GridBagConstraints.LINE_START;
            labelConstraints.insets = new Insets(4, 4, 4, 8);
            panel.add(new JLabel(label), labelConstraints);

            GridBagConstraints fieldConstraints = new GridBagConstraints();
            fieldConstraints.gridx = 1;
            fieldConstraints.gridy = row;
            fieldConstraints.weightx = 1;
            fieldConstraints.fill = GridBagConstraints.HORIZONTAL;
            fieldConstraints.insets = new Insets(4, 4, 4, 4);
            panel.add(field, fieldConstraints);
        }

        private void addAction(JPanel panel, String label, String name, String action) {
            JButton button = new JButton(label);
            button.setName(name);
            button.setToolTipText(action);
            button.addActionListener(event -> runAction(action));
            panel.add(button);
        }

        private void runAction(String action) {
            boolean confirmed = dryRun.isSelected();
            if (!confirmed && JOptionPane.showConfirmDialog(this,
                    "この操作はシンボリックリンクを変更します。続行しますか？", "確認",
                    JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) {
                confirmed = true;
            }
            if (!confirmed) {
                return;
            }

            Map<String, String> values = new HashMap<>();
            values.put("source-root", sourceRoot.getText().trim());
            values.put("target-root", targetRoot.getText().trim());
            values.put("link-name", claudeLinkName.getText().trim());
            values.put("force", Boolean.toString(force.isSelected()));
            String source = action.equals("link") ? "AGENTS.md" : "";
            if (!source.isBlank()) values.put("source", source);
            CommandRequest request = new CommandRequest(action, List.of(), values, false,
                    force.isSelected(), dryRun.isSelected(), confirmed, null);
            new SwingWorker<Integer, Void>() {
                @Override
                protected Integer doInBackground() throws Exception {
                    return DeveloperPlugin.runGuiAction(action, request, context);
                }

                @Override
                protected void done() {
                    try {
                        context.log().info(action + "終了: exit=" + get());
                    } catch (Exception exception) {
                        context.log().error(action + "失敗: " + exception.getMessage());
                    }
                }
            }.execute();
        }
    }

    private static int runGuiAction(String action, CommandRequest request, PluginContext context) throws Exception {
        return switch (action) {
            case "link" -> DeveloperSymlinkService.createSingleLink(request, context);
            case "links" -> DeveloperSymlinkService.createAll(request, context);
            default -> throw new IllegalArgumentException("未対応のGUIアクションです: " + action);
        };
    }
}
