package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2EIsolatedDeveloperTest {
    @TempDir
    Path temp;

    @Test
    void developerActionsProtectRegularFilesAndUseTheIsolatedRepository() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        Files.writeString(environment.repo().resolve("AGENTS.md"), "isolated source");
        Files.writeString(environment.repo().resolve("protected.md"), "must survive");

        var dryRun = environment.plugin("developer", "create-claude-link");
        dryRun.add("--link-name=dry-run.md");
        dryRun.add("--dry-run");
        assertSuccess(environment.run(dryRun));
        assertFalse(Files.exists(environment.repo().resolve("dry-run.md")));

        var protectedFile = environment.plugin("developer", "link");
        protectedFile.add("--link-name=protected.md");
        protectedFile.add("--yes");
        ProcessResult protectedResult = environment.run(protectedFile);
        assertNotEquals(0, protectedResult.exitCode(), protectedResult.output());
        assertEquals("must survive", Files.readString(environment.repo().resolve("protected.md")));
        assertSuccess(environment.run(environment.plugin("developer", "diagnose")));

        Path linkTarget = Files.createDirectories(environment.root().resolve("nicocache"));
        prepareSymlinkFixture(environment.repo(), linkTarget);
        var allDryRun = environment.plugin("developer", "links");
        allDryRun.add("--source-root=" + environment.repo());
        allDryRun.add("--target-root=" + linkTarget);
        allDryRun.add("--dry-run");
        ProcessResult allDryRunResult = environment.run(allDryRun);
        assertSuccess(allDryRunResult);
        assertTrue(allDryRunResult.output().replace('\\', '/').contains("local/list.js"));
        assertFalse(Files.exists(linkTarget.resolve("local/list.js")));

        var listJsDryRun = environment.plugin("developer", "listjs");
        listJsDryRun.add("--source-root=" + environment.repo());
        listJsDryRun.add("--target-root=" + linkTarget);
        listJsDryRun.add("--dry-run");
        assertSuccess(environment.run(listJsDryRun));

        if (!supportsSymbolicLinks(environment.root())) {
            return;
        }

        var all = environment.plugin("developer", "links");
        all.add("--source-root=" + environment.repo());
        all.add("--target-root=" + linkTarget);
        all.add("--yes");
        assertSuccess(environment.run(all));
        assertTrue(Files.isSymbolicLink(linkTarget.resolve("local/list.js")));
        assertEquals(environment.repo().resolve("local/features/dist/features.js").toRealPath(),
                linkTarget.resolve("local/list.js").toRealPath());

        var listJs = environment.plugin("developer", "create-listjs-symlink");
        listJs.add("--source-root=" + environment.repo());
        listJs.add("--target-root=" + linkTarget);
        listJs.add("--target=" + environment.repo().resolve("local/features/dist/features.js"));
        listJs.add("--link-dir=" + linkTarget.resolve("local"));
        listJs.add("--yes");
        assertSuccess(environment.run(listJs));
        assertTrue(Files.isSymbolicLink(linkTarget.resolve("local/list.js.map")));

        Path wrongTarget = Files.writeString(linkTarget.resolve("local/wrong.js"), "wrong");
        Files.delete(linkTarget.resolve("local/list.js"));
        Files.createSymbolicLink(linkTarget.resolve("local/list.js"), wrongTarget.getFileName());
        var forceListJs = environment.plugin("developer", "listjs");
        forceListJs.add("--source-root=" + environment.repo());
        forceListJs.add("--target-root=" + linkTarget);
        forceListJs.add("--target=" + environment.repo().resolve("local/features/dist/features.js"));
        forceListJs.add("--link-dir=" + linkTarget.resolve("local"));
        forceListJs.add("--force");
        forceListJs.add("--yes");
        assertSuccess(environment.run(forceListJs));
        assertEquals(environment.repo().resolve("local/features/dist/features.js").toRealPath(),
                linkTarget.resolve("local/list.js").toRealPath());

        Path protectedDirectory = Files.createDirectories(linkTarget.resolve("protected-local"));
        Path protectedList = Files.writeString(protectedDirectory.resolve("list.js"), "must survive");
        var protectedListJs = environment.plugin("developer", "listjs");
        protectedListJs.add("--target=" + environment.repo().resolve("local/features/dist/features.js"));
        protectedListJs.add("--link-dir=" + protectedDirectory);
        protectedListJs.add("--yes");
        assertSuccess(environment.run(protectedListJs));
        assertEquals("must survive", Files.readString(protectedList));

        var create = environment.plugin("developer", "link");
        create.add("--link-name=CLAUDE.md");
        create.add("--yes");
        assertSuccess(environment.run(create));
        assertTrue(Files.isSymbolicLink(environment.repo().resolve("CLAUDE.md")));

        var repeat = environment.plugin("developer", "link");
        repeat.add("--link-name=CLAUDE.md");
        repeat.add("--yes");
        assertSuccess(environment.run(repeat));

        Files.writeString(environment.repo().resolve("OTHER.md"), "other source");
        Files.delete(environment.repo().resolve("CLAUDE.md"));
        Files.createSymbolicLink(environment.repo().resolve("CLAUDE.md"), Path.of("OTHER.md"));
        var force = environment.plugin("developer", "link");
        force.add("--link-name=CLAUDE.md");
        force.add("--force");
        force.add("--yes");
        assertSuccess(environment.run(force));
        assertEquals(environment.repo().resolve("AGENTS.md").toRealPath(),
                environment.repo().resolve("CLAUDE.md").toRealPath());
    }

    private static void prepareSymlinkFixture(Path repo, Path target) throws IOException {
        Files.createDirectories(repo.resolve("scripts"));
        Files.createDirectories(repo.resolve("local/background-images"));
        Path dist = Files.createDirectories(repo.resolve("local/features/dist"));
        Files.createDirectories(repo.resolve("local/images"));
        Files.createDirectories(repo.resolve("nlFilters"));
        Files.createDirectories(repo.resolve("extensions"));
        Files.writeString(repo.resolve("local/mime.types"), "text/javascript");
        Files.writeString(dist.resolve("features.js"), "features");
        Files.writeString(dist.resolve("features.js.map"), "map");
        for (String filter : new String[]{"100_features.txt", "101_disable_official_function.txt", "105_premium_hide.txt"}) {
            Files.writeString(repo.resolve("nlFilters").resolve(filter), filter);
        }
        for (String extension : new String[]{"CommentFilterLogger.class", "ExtUtil.class",
                "FilterMatomeSeriesAlerts.class", "FilterMatomeSmartFetcher.class",
                "NicochartInfoProxy.class", "nlGpac.class", "nlMovieFetcher.class"}) {
            Files.writeString(repo.resolve("extensions").resolve(extension), extension);
        }
        Files.createDirectories(target.resolve("scripts"));
        Files.createDirectories(target.resolve("local"));
        Files.createDirectories(target.resolve("nlFilters"));
        Files.createDirectories(target.resolve("extensions"));
    }

    private static boolean supportsSymbolicLinks(Path root) throws IOException {
        Path target = root.resolve("symlink-probe-target");
        Path link = root.resolve("symlink-probe-link");
        Files.deleteIfExists(link);
        Files.writeString(target, "probe");
        try {
            Files.createSymbolicLink(link, target.getFileName());
            return true;
        } catch (UnsupportedOperationException | IOException exception) {
            return false;
        } finally {
            Files.deleteIfExists(link);
            Files.deleteIfExists(target);
        }
    }

    private static void assertSuccess(ProcessResult result) {
        assertEquals(0, result.exitCode(), result.output());
    }
}
