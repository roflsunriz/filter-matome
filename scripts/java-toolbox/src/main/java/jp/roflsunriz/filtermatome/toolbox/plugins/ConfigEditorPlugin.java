package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.PropertiesDocument;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.JTextField;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/** NicoCache_nlのpropertiesを文字コード・コメントを維持して編集するプラグイン。 */
public final class ConfigEditorPlugin implements ToolPlugin {
    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("config-editor", "設定エディタ", "propertiesの追加・編集・削除とdefaults辞書の表示", true, true);
    }

    @Override
    public String readme() {
        return "設定エディタ\n\n"
                + "UTF-8、Windows-31J、EUC-JPを自動判定し、既存コメントと順序を保って保存します。\n"
                + "保存前に .bak-<時刻> のバックアップを作成し、temporary fileから原子的に置き換えます。\n"
                + "既定の設定ファイルは --repo-root/config.properties、defaults辞書は --repo-root/defaults です。";
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new ConfigPanel(context);
    }

    @Override
    public int run(CommandRequest request, PluginContext context) throws Exception {
        Path path = Path.of(request.value("config", context.repo("config.properties").toString()));
        PropertiesDocument document = PropertiesDocument.load(path);
        String action = request.action().isBlank() ? "list" : request.action().toLowerCase();
        switch (action) {
            case "list", "show" -> {
                for (String key : document.keys()) {
                    context.log().info(key + "=" + document.value(key));
                }
            }
            case "available", "defaults" -> {
                Map<String, PropertiesDocument.Setting> available = PropertiesDocument.loadDefaults(
                        Path.of(request.value("defaults", context.repo("defaults").toString())));
                for (PropertiesDocument.Setting setting : available.values()) {
                    context.log().info(setting.key() + "=" + setting.value() + " [" + setting.source() + "]");
                }
            }
            case "set", "add", "edit" -> {
                String key = request.value("key", "").trim();
                if (key.isBlank()) throw new IllegalArgumentException("--key が必要です。");
                String value = request.value("value", "");
                PropertiesDocument.Setting defaultSetting = PropertiesDocument.loadDefaults(
                                Path.of(request.value("defaults", context.repo("defaults").toString())))
                        .get(key);
                if (value.isBlank() && defaultSetting != null) value = defaultSetting.value();
                document.set(key, value, defaultSetting == null ? "" : defaultSetting.comment());
                Path backup = document.save();
                context.log().info("設定を保存しました: " + path + (backup == null ? "" : " / backup=" + backup));
            }
            case "remove", "delete" -> {
                if (!request.confirmed()) throw new IllegalArgumentException("削除には --yes が必要です。");
                String key = request.value("key", "").trim();
                if (key.isBlank()) throw new IllegalArgumentException("--key が必要です。");
                document.remove(key);
                Path backup = document.save();
                context.log().info("設定を削除しました: " + key + (backup == null ? "" : " / backup=" + backup));
            }
            default -> throw new IllegalArgumentException("未対応の設定アクションです: " + action);
        }
        return 0;
    }

    private static final class ConfigPanel extends JPanel {
        private final PluginContext context;
        private final JTextField pathField = new JTextField();
        private final DefaultTableModel model = new DefaultTableModel(new Object[]{"キー", "値", "説明", "defaults元"}, 0) {
            @Override public boolean isCellEditable(int row, int column) { return column == 0 || column == 1; }
        };
        private final JTable table = new JTable(model);
        private PropertiesDocument document;
        private Map<String, PropertiesDocument.Setting> defaults = Map.of();

        private ConfigPanel(PluginContext context) {
            super(new BorderLayout(8, 8));
            this.context = context;
            setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
            pathField.setText(context.repo("config.properties").toString());
            build();
            load();
        }

        private void build() {
            JPanel fileBar = new JPanel(new BorderLayout(5, 5));
            fileBar.add(new JLabel("設定ファイル"), BorderLayout.WEST);
            fileBar.add(pathField, BorderLayout.CENTER);
            JButton browse = new JButton("参照");
            browse.addActionListener(event -> chooseFile());
            fileBar.add(browse, BorderLayout.EAST);
            table.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
            table.setAutoCreateRowSorter(true);
            table.setFillsViewportHeight(true);

            JButton load = new JButton("読み込み");
            load.addActionListener(event -> load());
            JButton add = new JButton("追加");
            add.addActionListener(event -> addSetting());
            JButton remove = new JButton("削除");
            remove.addActionListener(event -> removeSetting());
            JButton save = new JButton("保存（バックアップ）");
            save.addActionListener(event -> save());
            JButton defaultsButton = new JButton("defaults辞書");
            defaultsButton.addActionListener(event -> showDefaults());
            JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT));
            buttons.add(load); buttons.add(add); buttons.add(remove); buttons.add(save); buttons.add(defaultsButton);

            add(fileBar, BorderLayout.NORTH);
            add(new JScrollPane(table), BorderLayout.CENTER);
            add(buttons, BorderLayout.SOUTH);
        }

        private void chooseFile() {
            JFileChooser chooser = new JFileChooser(Path.of(pathField.getText()).toFile());
            if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
                pathField.setText(chooser.getSelectedFile().toPath().toString());
                load();
            }
        }

        private void load() {
            try {
                Path path = Path.of(pathField.getText().trim());
                document = PropertiesDocument.load(path);
                defaults = PropertiesDocument.loadDefaults(path.toAbsolutePath().getParent().resolve("defaults"));
                model.setRowCount(0);
                for (String key : document.keys()) {
                    PropertiesDocument.Setting setting = defaults.get(key);
                    model.addRow(new Object[]{key, document.value(key), document.comment(key), setting == null ? "" : setting.source()});
                }
                context.log().info("設定を読み込みました: " + path + " (" + document.charset().displayName() + ")");
            } catch (Exception exception) {
                context.log().error("設定の読み込みに失敗しました: " + exception.getMessage());
            }
        }

        private void addSetting() {
            JTextField key = new JTextField();
            JTextField value = new JTextField();
            JPanel panel = new JPanel(new GridLayout(2, 2, 5, 5));
            panel.add(new JLabel("キー")); panel.add(key); panel.add(new JLabel("値")); panel.add(value);
            if (JOptionPane.showConfirmDialog(this, panel, "設定追加", JOptionPane.OK_CANCEL_OPTION) == JOptionPane.OK_OPTION
                    && !key.getText().trim().isBlank()) {
                PropertiesDocument.Setting setting = defaults.get(key.getText().trim());
                model.addRow(new Object[]{key.getText().trim(), value.getText().isBlank() && setting != null ? setting.value() : value.getText(),
                        setting == null ? "" : setting.comment(), setting == null ? "" : setting.source()});
            }
        }

        private void removeSetting() {
            int row = table.getSelectedRow();
            if (row < 0) return;
            int modelRow = table.convertRowIndexToModel(row);
            String key = String.valueOf(model.getValueAt(modelRow, 0));
            if (JOptionPane.showConfirmDialog(this, "設定「" + key + "」を削除しますか？", "確認",
                    JOptionPane.YES_NO_OPTION) == JOptionPane.YES_OPTION) {
                model.removeRow(modelRow);
            }
        }

        private void save() {
            if (document == null) return;
            try {
                Set<String> current = new HashSet<>();
                for (int row = 0; row < model.getRowCount(); row++) {
                    String key = String.valueOf(model.getValueAt(row, 0)).trim();
                    String value = String.valueOf(model.getValueAt(row, 1));
                    if (key.isBlank()) continue;
                    current.add(key);
                    PropertiesDocument.Setting setting = defaults.get(key);
                    document.set(key, value, setting == null ? "" : setting.comment());
                }
                for (String key : new ArrayList<>(document.keys())) {
                    if (!current.contains(key)) document.remove(key);
                }
                Path backup = document.save();
                context.log().info("設定を保存しました: " + document.path() + " / backup=" + backup);
            } catch (Exception exception) {
                context.log().error("設定の保存に失敗しました: " + exception.getMessage());
            }
        }

        private void showDefaults() {
            StringBuilder text = new StringBuilder();
            defaults.values().forEach(setting -> text.append(setting.key()).append('=').append(setting.value())
                    .append(" [").append(setting.source()).append("]\n"));
            JTextField unused = new JTextField();
            unused.setVisible(false);
            JOptionPane.showMessageDialog(this, new JScrollPane(new javax.swing.JTextArea(text.toString(), 20, 70)),
                    "defaults辞書", JOptionPane.INFORMATION_MESSAGE);
        }
    }
}
