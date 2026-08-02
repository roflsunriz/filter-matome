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

        if (!supportsSymbolicLinks(environment.root())) {
            return;
        }
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
        assertEquals(environment.repo().resolve("AGENTS.md").toAbsolutePath().normalize(),
                environment.repo().resolve("CLAUDE.md").toRealPath());
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
