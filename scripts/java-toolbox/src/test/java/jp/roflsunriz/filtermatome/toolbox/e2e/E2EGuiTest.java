package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.MainWindow;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginManager;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.swing.SwingUtilities;
import java.awt.GraphicsEnvironment;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
}
