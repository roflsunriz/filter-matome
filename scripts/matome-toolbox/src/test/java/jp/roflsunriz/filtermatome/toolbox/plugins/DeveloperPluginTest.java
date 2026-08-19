package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.swing.JPanel;
import javax.swing.JTextField;
import java.awt.Component;
import java.awt.Container;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class DeveloperPluginTest {
    @TempDir
    Path temp;

    @Test
    void developerViewExposesPortableSourceAndTargetDefaults() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);

        JPanel panel = new DeveloperPlugin().createView(context);
        JTextField source = findTextField(panel, "developer-source-root");
        JTextField target = findTextField(panel, "developer-target-root");
        assertNotNull(source);
        assertNotNull(target);
        assertEquals(DeveloperSymlinkService.defaultSourceRoot(context).toString(), source.getText());
        assertEquals(DeveloperSymlinkService.defaultTargetRoot().toString(), target.getText());
        assertNull(findTextField(panel, "developer-listjs-target"));
    }

    private static JTextField findTextField(Container root, String name) {
        for (Component child : root.getComponents()) {
            if (child instanceof JTextField field && name.equals(field.getName())) {
                return field;
            }
            if (child instanceof Container container) {
                JTextField found = findTextField(container, name);
                if (found != null) return found;
            }
        }
        return null;
    }
}
