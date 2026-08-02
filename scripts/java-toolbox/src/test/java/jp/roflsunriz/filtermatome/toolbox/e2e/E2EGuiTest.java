package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.MainWindow;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginManager;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import java.awt.Component;
import java.awt.Container;
import java.awt.GraphicsEnvironment;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2EGuiTest {
    @TempDir
    Path temp;

    @Test
    void guiBuildsOneTabPerDiscoveredPlugin() throws Exception {
        Assumptions.assumeFalse(GraphicsEnvironment.isHeadless(), "GUIを表示できない環境ではGUI E2Eを実行しません。");
        Path repo = Files.createDirectories(temp.resolve("repo"));
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        try (PluginManager manager = new PluginManager(context)) {
            manager.discover();
            AtomicReference<MainWindow> window = new AtomicReference<>();
            SwingUtilities.invokeAndWait(() -> window.set(new MainWindow(manager, context)));
            assertEquals(5, window.get().tabCount());
            SwingUtilities.invokeAndWait(() -> window.get().close());
        }
    }

    @Test
    void headlessGuiExposesAllMigratedNicoCacheUtilityActions() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo-actions"));
        JPanel panel = (JPanel) new jp.roflsunriz.filtermatome.toolbox.plugins.NicoCachePlugin()
                .createView(TestSupport.context(temp.resolve("data-actions"), repo));
        Set<String> buttonNames = new HashSet<>();
        collectButtonNames(panel, buttonNames);

        for (String action : List.of("launch-headless", "launch-gui", "force-stop", "build-java-apps",
                "compile-java-files", "open-uploader", "open-wiki", "open-bbs", "set-java-home",
                "open-environment", "proxy-set", "proxy-remove", "proxy-check", "firefox-proxy",
                "open-proxy-settings", "certificate-renew", "certificate-delete", "certificate-add",
                "open-certificate-manager", "generate-certificates", "open-bouncycastle", "task-install",
                "open-task-scheduler", "java-version", "open-adoptium")) {
            assertTrue(buttonNames.contains("nicocache-action-" + action), "GUIに未移植メニューがあります: " + action);
        }
    }

    private static void collectButtonNames(Container container, Set<String> names) {
        for (Component component : container.getComponents()) {
            if (component instanceof JButton button && button.getName() != null) {
                names.add(button.getName());
            }
            if (component instanceof Container child) {
                collectButtonNames(child, names);
            }
        }
    }
}
