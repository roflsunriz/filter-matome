package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.PropertiesDocument;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2ECommandLineTest {
    @TempDir
    Path temp;

    @Test
    void childProcessListsPluginsRunsSelfTestAndEditsConfig() throws Exception {
        Path data = temp.resolve("data");
        Path repo = Files.createDirectories(temp.resolve("repo"));
        ProcessResult list = TestSupport.runMain(List.of("--headless", "--list-plugins", "--data-dir", data.toString(),
                "--repo-root", repo.toString()), temp);
        assertEquals(0, list.exitCode());
        assertTrue(list.output().contains("media\t"));
        assertTrue(list.output().contains("config-editor\t"));
        assertTrue(list.output().contains("developer\t"));
        assertFalse(list.output().contains("nicocache\t"), "NicoCache管理はmatome-toolboxから削除されています。");

        ProcessResult selfTest = TestSupport.runMain(List.of("--headless", "--self-test", "--data-dir", data.toString(),
                "--repo-root", repo.toString()), temp);
        assertEquals(0, selfTest.exitCode());
        assertTrue(selfTest.output().contains("[INFO]"));

        ProcessResult headlessGui = TestSupport.runMain(List.of("--headless", "--gui-smoke", "--data-dir",
                data.toString(), "--repo-root", repo.toString()), temp);
        assertEquals(0, headlessGui.exitCode(), headlessGui.output());

        Path config = temp.resolve("e2e.properties");
        ProcessResult set = TestSupport.runMain(List.of(
                "--headless", "--plugin", "config-editor", "--action", "set", "--config", config.toString(),
                "--key", "e2e.key", "--value", "after", "--data-dir", data.toString(), "--repo-root", repo.toString()),
                temp);
        assertEquals(0, set.exitCode());
        assertEquals("after", PropertiesDocument.load(config).value("e2e.key"));

        Path media = Files.writeString(temp.resolve("video with spaces.mp4"), "not a video");
        ProcessResult dryRun = TestSupport.runMain(List.of(
                "--headless", "--plugin", "media", "--action", "faststart", "--input", media.toString(),
                "--dry-run", "--data-dir", data.toString(), "--repo-root", repo.toString()), temp);
        assertEquals(0, dryRun.exitCode());
        assertTrue(dryRun.output().contains("faststart"));
    }

    @Test
    void helpUsesTheOfficialProductAndJarNames() throws Exception {
        Path data = temp.resolve("help-data");
        Path repo = Files.createDirectories(temp.resolve("help-repo"));
        ProcessResult help = TestSupport.runMain(List.of("--headless", "--help", "--data-dir", data.toString(),
                "--repo-root", repo.toString()), temp);

        assertEquals(0, help.exitCode(), help.output());
        assertTrue(help.output().contains("matome-toolbox"));
        assertTrue(help.output().contains("matome-toolbox-0.1.0-SNAPSHOT.jar"));
        assertFalse(help.output().contains("filter-matome-toolbox"));
        assertFalse(help.output().contains("Java Toolbox"));
    }
}
