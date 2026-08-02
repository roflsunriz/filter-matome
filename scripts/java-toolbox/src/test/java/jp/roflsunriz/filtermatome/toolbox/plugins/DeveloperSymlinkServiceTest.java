package jp.roflsunriz.filtermatome.toolbox.plugins;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeveloperSymlinkServiceTest {
    @TempDir
    Path temp;

    @Test
    void defaultSourceIsTheWindowsRepositoryAndPortableRepositoryElsewhere() throws Exception {
        Path repository = Files.createDirectories(temp.resolve("filter-matome"));

        assertEquals("C:\\filter-matome",
                DeveloperSymlinkService.defaultSourceRoot("Windows 11", repository).toString());
        assertEquals(repository.toAbsolutePath().normalize(),
                DeveloperSymlinkService.defaultSourceRoot("Linux", repository));
        assertEquals(repository.toAbsolutePath().normalize(),
                DeveloperSymlinkService.defaultSourceRoot("Mac OS X", repository));
    }

    @Test
    void defaultTargetMatchesEachOperatingSystemsUserConfigurationLocation() throws Exception {
        Path home = Files.createDirectories(temp.resolve("home")).toAbsolutePath().normalize();
        Path localAppData = Files.createDirectories(temp.resolve("local-app-data")).toAbsolutePath().normalize();
        Path xdgConfig = Files.createDirectories(temp.resolve("xdg-config")).toAbsolutePath().normalize();

        assertEquals(localAppData.resolve("NicoCache_nl"), DeveloperSymlinkService.defaultTargetRoot(
                "Windows 11", localAppData.toString(), "", home.toString()));
        assertEquals(xdgConfig.resolve("NicoCache_nl"), DeveloperSymlinkService.defaultTargetRoot(
                "Linux", "", xdgConfig.toString(), home.toString()));
        assertEquals(home.resolve(".config/NicoCache_nl"), DeveloperSymlinkService.defaultTargetRoot(
                "Linux", "", "", home.toString()));
        assertEquals(home.resolve("Library/Application Support/NicoCache_nl"),
                DeveloperSymlinkService.defaultTargetRoot("Mac OS X", "", "", home.toString()));
    }

    @Test
    void allLinksIncludeListJsButListJsMapIsHandledByTheDedicatedAction() {
        assertTrue(DeveloperSymlinkService.allLinkDefinitions().stream()
                .anyMatch(definition -> definition.source().equals("local/features/dist/features.js")
                        && definition.link().equals("local/list.js")));
        assertTrue(DeveloperSymlinkService.allLinkDefinitions().stream()
                .noneMatch(definition -> definition.link().equals("local/list.js.map")));
    }
}
