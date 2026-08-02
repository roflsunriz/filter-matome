package jp.roflsunriz.filtermatome.toolbox.functional;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PropertiesDocument;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import jp.roflsunriz.filtermatome.toolbox.plugins.ConfigEditorPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.DeveloperPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.MediaPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.NicoCachePlugin;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FunctionalPluginTest {
    @TempDir
    Path temp;

    @Test
    void configEditorSetsListsAndRemovesPropertiesWithBackup() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        Path config = Files.writeString(temp.resolve("config.properties"), "# keep this comment\nold.key=before\n");
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        ConfigEditorPlugin plugin = new ConfigEditorPlugin();
        List<String> logs = TestSupport.captureLogs(context.log());

        CommandRequest set = TestSupport.request("set", List.of(), Map.of(
                "config", config.toString(), "key", "new.key", "value", "after"),
                false, false, false, true, null);
        assertEquals(0, plugin.run(set, context));
        assertEquals("after", PropertiesDocument.load(config).value("new.key"));
        assertTrue(logs.stream().anyMatch(line -> line.contains("設定を保存しました")));

        CommandRequest list = TestSupport.request("list", List.of(), Map.of("config", config.toString()),
                false, false, false, true, null);
        assertEquals(0, plugin.run(list, context));
        assertTrue(logs.stream().anyMatch(line -> line.contains("old.key=before")));

        CommandRequest remove = TestSupport.request("remove", List.of(), Map.of(
                "config", config.toString(), "key", "old.key"), false, false, false, true, null);
        assertEquals(0, plugin.run(remove, context));
        assertFalse(PropertiesDocument.load(config).keys().contains("old.key"));
        try (var files = Files.list(config.getParent())) {
            assertTrue(files.anyMatch(path -> path.getFileName().toString().startsWith("config.properties.bak-")));
        }
    }

    @Test
    void mediaDryRunBuildsShellFreeCommandForPathsWithSpaces() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        Path input = Files.writeString(temp.resolve("動画 with spaces.mp4"), "not a real video");
        Path output = temp.resolve("output with spaces");
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        List<String> logs = TestSupport.captureLogs(context.log());

        CommandRequest request = TestSupport.request("faststart", List.of(input.toString()), Map.of(
                "ffmpeg", "ffmpeg with spaces"), false, false, true, true, output);
        assertEquals(0, new MediaPlugin().run(request, context));
        assertFalse(Files.exists(output));
        assertTrue(logs.stream().anyMatch(line -> line.contains("動画 with spaces.mp4")));
        assertTrue(logs.stream().anyMatch(line -> line.contains("動画 with spaces_faststart.mp4")));
        assertTrue(logs.stream().anyMatch(line -> line.contains("DRY-RUN:")));
    }

    @Test
    void developerAndNicoCacheOperationsDoNotMutateWithoutExplicitExecution() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        Files.writeString(repo.resolve("AGENTS.md"), "source");
        Files.createDirectories(repo.resolve("scripts"));
        Path existingLinkName = Files.writeString(repo.resolve("CLAUDE.md"), "keep");
        Path dataRoot = Files.createDirectories(temp.resolve("nico-data"));
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        List<String> logs = TestSupport.captureLogs(context.log());

        CommandRequest linkDryRun = TestSupport.request("link", List.of(), Map.of(
                "source", "AGENTS.md", "link-name", "new-link.md"), false, false, true, false, null);
        assertEquals(0, new DeveloperPlugin().run(linkDryRun, context));
        assertFalse(Files.exists(repo.resolve("new-link.md")));

        CommandRequest regularFile = TestSupport.request("link", List.of(), Map.of(
                "source", "AGENTS.md", "link-name", existingLinkName.getFileName().toString()),
                false, false, false, true, null);
        assertThrows(IOException.class, () -> new DeveloperPlugin().run(regularFile, context));
        assertEquals("keep", Files.readString(existingLinkName));

        CommandRequest linksDryRun = TestSupport.request("links", List.of(), Map.of(
                "app-root", repo.toString(), "data-root", dataRoot.toString(), "source-root", repo.toString()),
                false, false, true, true, null);
        assertEquals(0, new NicoCachePlugin().run(linksDryRun, context));
        assertFalse(Files.exists(dataRoot.resolve("scripts")));
        assertTrue(logs.stream().anyMatch(line -> line.contains("DRY-RUN:")));
    }
}
