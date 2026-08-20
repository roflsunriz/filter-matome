package jp.roflsunriz.filtermatome.toolbox;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitCoreTest {
    @TempDir
    Path temp;

    @Test
    void cliOptionsParsesInlineSeparateAndCustomArguments() {
        CliOptions options = CliOptions.parse(new String[]{
                "--headless", "--plugin=media", "--action", "faststart", "--input", "movie with space.mp4",
                "--recursive", "--dry-run", "--ffmpeg", "custom ffmpeg", "--data-dir", "data dir"
        });

        assertTrue(options.headless());
        assertEquals("media", options.plugin());
        assertEquals("faststart", options.action());
        assertEquals(List.of("movie with space.mp4"), options.inputs());
        assertEquals("custom ffmpeg", options.values().get("ffmpeg"));
        assertEquals(Path.of("data dir"), options.dataDir());
        assertEquals("true", options.request().value("headless", "false"));
        assertThrows(IllegalArgumentException.class, () -> CliOptions.parse(new String[]{"--plugin"}));
    }

    @Test
    void jsonParsesNestedEscapesNumbersAndRejectsTrailingText() {
        Map<String, Object> root = Json.object(Json.parse(
                "{\"title\":\"日本語\\n\\uD83D\\uDE00\",\"enabled\":true,"
                        + "\"values\":[1,-2.5,1.2e3],\"empty\":null}"));

        assertEquals("日本語\n😀", Json.string(root.get("title"), ""));
        assertTrue(Json.bool(root.get("enabled"), false));
        assertEquals(3, Json.array(root.get("values")).size());
        assertEquals("1200.0", Json.numberText(Json.array(root.get("values")).get(2), ""));
        assertEquals("42", Json.numberText(Json.object(Json.parse("{\"id\":42}" )).get("id"), ""));
        assertNull(root.get("empty"));
        assertThrows(IllegalArgumentException.class, () -> Json.parse("{} trailing"));
    }

    @Test
    void fileSafetyCollectsRecursivelyAndProtectsNamesAndBackups() throws Exception {
        Path source = Files.createDirectories(temp.resolve("input"));
        Path nested = Files.createDirectories(source.resolve("nested"));
        Path mp4 = Files.writeString(source.resolve("a.MP4"), "a");
        Path mkv = Files.writeString(nested.resolve("b.mkv"), "b");
        Files.writeString(nested.resolve("ignore.txt"), "ignore");

        assertEquals(List.of(mp4.toAbsolutePath().normalize(), mkv.toAbsolutePath().normalize()),
                FileSafety.collect(List.of(source.toString()), Set.of(".mp4", ".mkv"), true));
        assertEquals("a_b_c_.mp4", FileSafety.safeFileName("a:b/c?.mp4"));
        assertEquals("untitled", FileSafety.safeFileName(null));
        assertThrows(java.io.IOException.class, () -> FileSafety.ensureDifferent(mp4, mp4));

        Path backup = FileSafety.backup(mp4);
        assertNotNull(backup);
        assertTrue(Files.exists(backup));
        assertEquals("a", Files.readString(backup));

        Path sameTimeBackup = FileSafety.backup(mp4, () -> 1L);
        Path sameTimeBackup2 = FileSafety.backup(mp4, () -> 1L);
        assertEquals("a.MP4.bak-1", sameTimeBackup.getFileName().toString());
        assertEquals("a.MP4.bak-2", sameTimeBackup2.getFileName().toString());
        assertEquals("a", Files.readString(sameTimeBackup2));
    }

    @Test
    void propertiesDocumentPreservesEncodingCommentsOrderAndBackups() throws Exception {
        Charset sjis = Charset.forName("Windows-31J");
        Path file = temp.resolve("config.properties");
        String original = "# コメント\r\nold.key=before\r\n\r\nother:value\r\n";
        Files.write(file, original.getBytes(sjis));

        PropertiesDocument document = PropertiesDocument.load(file);
        assertEquals(sjis, document.charset());
        assertEquals(List.of("old.key", "other"), document.keys());
        assertEquals("# コメント", document.comment("old.key"));
        document.set("old.key", "after", "ignored for existing key");
        document.set("new.key", "値", "新しい説明");
        Path backup = document.save();

        assertNotNull(backup);
        assertTrue(Files.exists(backup));
        PropertiesDocument reloaded = PropertiesDocument.load(file);
        assertEquals(List.of("old.key", "other", "new.key"), reloaded.keys());
        assertEquals("after", reloaded.value("old.key"));
        assertEquals("値", reloaded.value("new.key"));
        assertTrue(new String(Files.readAllBytes(file), sjis).contains("NicoCache_nl 設定ファイル"));

        reloaded.remove("other");
        reloaded.save();
        assertNull(reloaded.value("other"));
        assertFalse(PropertiesDocument.load(file).keys().contains("other"));
    }

    @Test
    void appConfigRoundTripsTypedValuesAndCreatesBackup() throws Exception {
        Path file = temp.resolve("nested").resolve("app.properties");
        AppConfig first = new AppConfig(file);
        first.set("name", "値");
        first.set("count", "12");
        first.set("enabled", "true");
        first.save();

        AppConfig second = new AppConfig(file);
        assertEquals("値", second.get("name", ""));
        assertEquals(12, second.getInt("count", 0));
        assertTrue(second.getBoolean("enabled", false));
        assertEquals(7, second.getInt("missing", 7));
        second.set("count", "not-a-number");
        assertEquals(9, second.getInt("count", 9));
        second.save();

        try (var files = Files.list(file.getParent())) {
            assertTrue(files.anyMatch(path -> path.getFileName().toString().startsWith("app.properties.bak-")));
        }
    }

    @Test
    void appPathsMigratesTheLegacyDataDirectoryToTheOfficialName() throws Exception {
        Path userHome = Files.createDirectories(temp.resolve("home"));
        Path legacy = Files.createDirectories(userHome.resolve(".filter-matome-toolbox"));
        Files.writeString(legacy.resolve("app.properties"), "test.key=value");
        Path repo = Files.createDirectories(temp.resolve("repo"));
        String previousUserHome = System.getProperty("user.home");

        try {
            System.setProperty("user.home", userHome.toString());
            AppPaths paths = AppPaths.discover(CliOptions.parse(new String[]{"--repo-root", repo.toString()}));

            assertEquals(userHome.resolve(".matome-toolbox").toAbsolutePath().normalize(), paths.dataDir());
            assertTrue(Files.exists(paths.configFile()));
            assertFalse(Files.exists(legacy));
        } finally {
            System.setProperty("user.home", previousUserHome);
        }
    }

    @Test
    void cancellationAndCommandRequestExposeSafeValues() {
        CancellationToken token = new CancellationToken();
        assertFalse(token.isCancelled());
        token.cancel();
        assertTrue(token.isCancelled());

        CommandRequest request = TestSupport.request("run", List.of("input"), Map.of("flag", "true"), true,
                false, true, false, null);
        assertEquals("fallback", request.value("missing", "fallback"));
        assertTrue(request.flag("flag"));
        assertFalse(request.flag("missing"));
    }
}
