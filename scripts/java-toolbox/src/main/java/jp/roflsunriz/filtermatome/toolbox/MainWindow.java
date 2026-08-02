package jp.roflsunriz.filtermatome.toolbox;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JTabbedPane;
import javax.swing.JTextArea;
import javax.swing.JScrollPane;
import javax.swing.JPanel;
import javax.swing.JSplitPane;
import javax.swing.SwingUtilities;
import java.awt.BorderLayout;
import java.awt.Dialog;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GraphicsEnvironment;

public final class MainWindow {
    private static final Dimension README_DIALOG_INITIAL_SIZE = new Dimension(900, 650);
    private final PluginManager manager;
    private final PluginContext context;
    private final JFrame frame;
    private final JTabbedPane tabs = new JTabbedPane();
    private final JTextArea globalLog = new JTextArea();

    public MainWindow(PluginManager manager, PluginContext context) {
        this.manager = manager;
        this.context = context;
        this.frame = GraphicsEnvironment.isHeadless() ? null : new JFrame("filter-matome Toolbox");
        build();
    }

    private void build() {
        if (frame != null) {
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.setMinimumSize(new Dimension(760, 520));
            frame.setSize(1120, 760);
        }

        for (ToolPlugin plugin : manager.all()) {
            PluginDescriptor descriptor = plugin.descriptor();
            tabs.addTab(descriptor.name(), plugin.createView(context));
            int index = tabs.getTabCount() - 1;
            tabs.setToolTipTextAt(index, descriptor.description());
        }

        globalLog.setEditable(false);
        globalLog.setLineWrap(true);
        globalLog.setWrapStyleWord(true);
        globalLog.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 12));
        context.log().addListener(line -> SwingUtilities.invokeLater(() -> {
            globalLog.append(line + System.lineSeparator());
            globalLog.setCaretPosition(globalLog.getDocument().getLength());
        }));

        JButton help = new JButton("選択中のREADME");
        help.setName("readme-button");
        help.addActionListener(event -> {
            int index = tabs.getSelectedIndex();
            if (index < 0 || index >= manager.all().size()) {
                return;
            }
            showReadme(manager.all().get(index));
        });
        JLabel status = new JLabel("プラグイン " + manager.all().size() + " 件 / 外部JARは data/plugins から検出");
        JPanel toolbar = new JPanel(new FlowLayout(FlowLayout.LEFT));
        toolbar.add(help);
        toolbar.add(status);

        JPanel logPanel = new JPanel(new BorderLayout());
        logPanel.setBorder(BorderFactory.createTitledBorder("ログ"));
        logPanel.add(new JScrollPane(globalLog), BorderLayout.CENTER);
        logPanel.setPreferredSize(new Dimension(100, 170));

        JSplitPane split = new JSplitPane(JSplitPane.VERTICAL_SPLIT, tabs, logPanel);
        split.setResizeWeight(0.78);

        if (frame != null) {
            frame.add(toolbar, BorderLayout.NORTH);
            frame.add(split, BorderLayout.CENTER);
        }
    }

    public void show() {
        if (frame != null) {
            SwingUtilities.invokeLater(() -> frame.setVisible(true));
        }
    }

    public void close() {
        if (frame != null) {
            frame.dispose();
        }
    }

    private void showReadme(ToolPlugin plugin) {
        JTextArea readme = new JTextArea(plugin.readme());
        readme.setEditable(false);
        readme.setLineWrap(true);
        readme.setWrapStyleWord(true);
        readme.setCaretPosition(0);

        JDialog dialog = new JDialog(frame, plugin.descriptor().name() + " README", Dialog.ModalityType.APPLICATION_MODAL);
        dialog.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
        dialog.setMinimumSize(new Dimension(600, 420));
        dialog.setSize(readmeDialogInitialSize());
        dialog.add(new JScrollPane(readme));
        dialog.setLocationRelativeTo(frame);
        dialog.setVisible(true);
    }

    /** README表示が初めから本文を読める大きさになることをテスト・診断から確認する。 */
    public static Dimension readmeDialogInitialSize() {
        return new Dimension(README_DIALOG_INITIAL_SIZE);
    }

    /** GUIスモークテストや外部診断から、実際に構築されたタブ数を確認する。 */
    public int tabCount() {
        return tabs.getTabCount();
    }
}
