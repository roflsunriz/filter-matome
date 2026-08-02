package jp.roflsunriz.filtermatome.toolbox.plugins;

import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.swing.JTable;
import java.awt.Rectangle;
import java.awt.event.MouseEvent;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConfigEditorPluginTest {
    @TempDir
    Path temp;

    @Test
    void defaultConfigPathUsesThePlatformUserConfigurationLocation() {
        Path home = temp.resolve("home").toAbsolutePath().normalize();
        Path localAppData = temp.resolve("local-app-data").toAbsolutePath().normalize();
        Path xdgConfig = temp.resolve("xdg-config").toAbsolutePath().normalize();

        assertEquals(localAppData.resolve("NicoCache_nl/config.properties"),
                ConfigEditorPlugin.defaultConfigPath("Windows 11", localAppData.toString(), "", home.toString()));
        assertEquals(xdgConfig.resolve("NicoCache_nl/config.properties"),
                ConfigEditorPlugin.defaultConfigPath("Linux", "", xdgConfig.toString(), home.toString()));
        assertEquals(home.resolve(".config/NicoCache_nl/config.properties"),
                ConfigEditorPlugin.defaultConfigPath("Linux", "", "", home.toString()));
        assertEquals(home.resolve("Library/Application Support/NicoCache_nl/config.properties"),
                ConfigEditorPlugin.defaultConfigPath("Mac OS X", "", "", home.toString()));
    }

    @Test
    void defaultsValueDoubleClickAddsTheValueToSettingsTable() throws Exception {
        Path config = Files.writeString(temp.resolve("config.properties"), "existing=old\n");
        Path defaults = Files.createDirectories(temp.resolve("defaults"));
        Files.writeString(defaults.resolve("default.properties"), "# default setting\nnew.key=default value\n");
        Path repo = Files.createDirectories(temp.resolve("repo"));
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        ConfigEditorPlugin.ConfigPanel panel = new ConfigEditorPlugin.ConfigPanel(context, config);
        assertEquals(config.toString(), panel.configPath());

        JTable defaultsTable = panel.createDefaultsTable();
        defaultsTable.setSize(800, 300);
        Rectangle valueCell = defaultsTable.getCellRect(0, 1, false);
        MouseEvent doubleClick = new MouseEvent(defaultsTable, MouseEvent.MOUSE_CLICKED,
                System.currentTimeMillis(), 0, valueCell.x + valueCell.width / 2,
                valueCell.y + valueCell.height / 2, 2, false, MouseEvent.BUTTON1);
        defaultsTable.dispatchEvent(doubleClick);

        JTable settingsTable = panel.settingsTable();
        assertEquals(2, settingsTable.getRowCount());
        assertEquals("new.key", settingsTable.getValueAt(1, 0));
        assertEquals("default value", settingsTable.getValueAt(1, 1));
    }
}
