package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class E2EIsolatedNicoCacheDeveloperTest {
    @TempDir
    Path temp;

    @Test
    void nicocacheActionsRunWithFakeLaunchersAndPrivateRoots() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        prepareNicoCacheFixture(environment);
        Path fakeJava = environment.tool("java");
        Path fakeJavac = environment.tool("javac");

        assertSuccess(environment.run(nico(environment, "diagnose", fakeJava, fakeJavac,
                "--ffmpeg=" + environment.tool("ffmpeg"), "--ffprobe=" + environment.tool("ffprobe"))));
        assertSuccess(environment.run(nico(environment, "check", fakeJava, fakeJavac,
                "--ffmpeg=" + environment.tool("ffmpeg"), "--ffprobe=" + environment.tool("ffprobe"))));
        assertSuccess(environment.run(nico(environment, "java-version", fakeJava, fakeJavac)));

        assertSuccess(environment.run(nico(environment, "launch", fakeJava, fakeJavac, "--yes", "--start")));
        assertSuccess(environment.run(nico(environment, "task-install", fakeJava, fakeJavac, "--yes")));
        assertSuccess(environment.run(nico(environment, "generate-certificates", fakeJava, fakeJavac, "--yes")));
        assertSuccess(environment.run(nico(environment, "build", fakeJava, fakeJavac, "--yes")));
        assertTrue(Files.isRegularFile(environment.repo().resolve("extensions/TestExtension.class")));
        assertSuccess(environment.run(nico(environment, "open", fakeJava, fakeJavac,
                "--dry-run", "--url=http://127.0.0.1/isolated")));

        runCertificateAndProxyBoundaries(environment);
        runFirefoxProxyInPrivateHome(environment);
        runLinksInPrivateDataRoot(environment);
        runStopAgainstOnlyTheFixtureProcess(environment);

        String toolLog = environment.toolLogText();
        assertTrue(toolLog.contains("java\t-jar"), "起動・証明書・タスクの外部Java境界を通っていません。");
        assertTrue(toolLog.contains("javac\t-Xlint"), "拡張ビルドのjavac境界を通っていません。");
        assertTrue(toolLog.contains("certutil\t"), "証明書ストアの外部コマンド境界を通っていません。");
        assertTrue(toolLog.contains("reg\t"), "レジストリの外部コマンド境界を通っていません。");
    }

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

    private static void prepareNicoCacheFixture(IsolatedEnvironment environment) throws IOException {
        Files.writeString(environment.app().resolve("NicoCache_nl.jar"), "fake application");
        Files.writeString(environment.app().resolve("NicoCacheLauncher.jar"), "fake launcher");
        Files.writeString(environment.app().resolve("NicoCacheCA.jar"), "fake certificate tool");
        Files.writeString(environment.app().resolve("certificate-targets.txt"), "isolated target\n");
        Files.createDirectories(environment.data().resolve("certs"));
        Files.writeString(environment.data().resolve("certs/ca.cer"), "fake certificate");
        Files.createDirectories(environment.data().resolve("local"));
        Files.createDirectories(environment.data().resolve("nlFilters"));
        Files.createDirectories(environment.data().resolve("extensions"));

        Files.createDirectories(environment.repo().resolve("scripts"));
        Files.createDirectories(environment.repo().resolve("local/background-images"));
        Files.createDirectories(environment.repo().resolve("local/features/dist"));
        Files.createDirectories(environment.repo().resolve("local/images"));
        Files.createDirectories(environment.repo().resolve("extensions"));
        Files.createDirectories(environment.repo().resolve("nlFilters"));
        Files.writeString(environment.repo().resolve("local/mime.types"), "text/plain txt\n");
        Files.writeString(environment.repo().resolve("local/features/dist/features.js"), "fake features\n");
        Files.writeString(environment.repo().resolve("local/features/dist/features.js.map"), "fake map\n");
        for (String name : List.of("100_features.txt", "101_disable_official_function.txt", "105_premium_hide.txt")) {
            Files.writeString(environment.repo().resolve("nlFilters").resolve(name), "fake filter\n");
        }
        for (String name : List.of("CommentFilterLogger.class", "CustomCacheReturner.class", "downloadThruFFmpeg.class",
                "ExtUtil.class", "FilterMatomeCacheControl.class", "FilterMatomeSeriesAlerts.class",
                "NicochartInfoProxy.class", "nlGpac.class")) {
            Files.writeString(environment.repo().resolve("extensions").resolve(name), "fake class");
        }
        Files.writeString(environment.repo().resolve("extensions/TestExtension.java"),
                "public class TestExtension { }");
    }

    private static List<String> nico(IsolatedEnvironment environment, String action, Path java, Path javac,
                                     String... extra) throws IOException {
        var arguments = environment.plugin("nicocache", action);
        arguments.add("--app-root=" + environment.app());
        arguments.add("--data-root=" + environment.data());
        arguments.add("--source-root=" + environment.repo());
        arguments.add("--java=" + java);
        arguments.add("--javac=" + javac);
        arguments.addAll(List.of(extra));
        return arguments;
    }

    private static void runCertificateAndProxyBoundaries(IsolatedEnvironment environment) throws Exception {
        Path fakeCertutil = environment.tool("certutil");
        Path fakeReg = environment.tool("reg");
        Map<String, String> windowsProperties = Map.of("filterMatome.toolbox.test.platform", "windows");
        for (String action : List.of("certificate-add", "certificate-delete", "certificate-renew",
                "proxy-set", "proxy-remove", "proxy-check")) {
            var arguments = environment.plugin("nicocache", action);
            arguments.add("--app-root=" + environment.app());
            arguments.add("--data-root=" + environment.data());
            arguments.add("--certutil=" + fakeCertutil);
            arguments.add("--reg=" + fakeReg);
            arguments.add("--proxy-url=http://127.0.0.1:9/isolated.pac");
            arguments.add("--yes");
            assertSuccess(environment.run(arguments, Map.of(), windowsProperties));
        }
        var unsupported = environment.plugin("nicocache", "proxy-check");
        unsupported.add("--app-root=" + environment.app());
        unsupported.add("--data-root=" + environment.data());
        assertNotEquals(0, environment.run(unsupported, Map.of(),
                Map.of("filterMatome.toolbox.test.platform", "linux")).exitCode());
    }

    private static void runFirefoxProxyInPrivateHome(IsolatedEnvironment environment) throws Exception {
        Path appData = Files.createDirectories(environment.root().resolve("appdata"));
        Path profile = Files.createDirectories(appData.resolve("Mozilla/Firefox/Profiles/e2e.default"));
        Map<String, String> extraEnvironment = Map.of("APPDATA", appData.toString());
        Path userJs = Files.writeString(profile.resolve("user.js"), "user_pref(\"existing\", true);\n");
        var arguments = environment.plugin("nicocache", "firefox-proxy");
        arguments.add("--app-root=" + environment.app());
        arguments.add("--data-root=" + environment.data());
        arguments.add("--proxy-url=http://127.0.0.1:9/isolated.pac");
        arguments.add("--yes");
        assertSuccess(environment.run(arguments, extraEnvironment,
                Map.of("filterMatome.toolbox.test.platform", "windows")));
        String configured = Files.readString(userJs);
        assertTrue(configured.contains("network.proxy.autoconfig_url"));
        assertTrue(configured.contains("security.enterprise_roots.enabled"));
        try (var files = Files.list(userJs.getParent())) {
            assertTrue(files.anyMatch(path -> path.getFileName().toString().startsWith("user.js.bak-")));
        }
    }

    private static void runLinksInPrivateDataRoot(IsolatedEnvironment environment) throws Exception {
        Path linksData = Files.createDirectories(environment.root().resolve("links-data"));
        Files.createDirectories(linksData.resolve("local"));
        Files.createDirectories(linksData.resolve("nlFilters"));
        Files.createDirectories(linksData.resolve("extensions"));
        var links = environment.plugin("nicocache", "links");
        links.add("--app-root=" + environment.app());
        links.add("--data-root=" + linksData);
        links.add("--source-root=" + environment.repo());
        links.add("--yes");
        ProcessResult result = environment.run(links);
        if (supportsSymbolicLinks(environment.root())) {
            assertSuccess(result);
            assertTrue(Files.isSymbolicLink(linksData.resolve("scripts")));
            ProcessResult repeat = environment.run(links);
            assertSuccess(repeat);
        } else {
            assertNotEquals(0, result.exitCode(), result.output());
            assertFalse(Files.exists(linksData.resolve("scripts")));
        }

        Path protectedData = Files.createDirectories(environment.root().resolve("protected-links-data"));
        Files.createDirectories(protectedData.resolve("local"));
        Files.createDirectories(protectedData.resolve("nlFilters"));
        Files.createDirectories(protectedData.resolve("extensions"));
        Files.writeString(protectedData.resolve("scripts"), "do not delete");
        var protectedLinks = environment.plugin("nicocache", "links");
        protectedLinks.add("--app-root=" + environment.app());
        protectedLinks.add("--data-root=" + protectedData);
        protectedLinks.add("--source-root=" + environment.repo());
        protectedLinks.add("--yes");
        ProcessResult protectedResult = environment.run(protectedLinks);
        if (supportsSymbolicLinks(environment.root())) {
            assertEquals(0, protectedResult.exitCode(), protectedResult.output());
        } else {
            assertNotEquals(0, protectedResult.exitCode(), protectedResult.output());
        }
        assertEquals("do not delete", Files.readString(protectedData.resolve("scripts")));
    }

    private static void runStopAgainstOnlyTheFixtureProcess(IsolatedEnvironment environment) throws Exception {
        Path jar = environment.app().resolve("NicoCache_nl.jar").toAbsolutePath().normalize();
        Process target = new ProcessBuilder(TestSupport.javaCommand("sleep", "-jar", jar.toString()))
                .directory(environment.root().toFile())
                .redirectErrorStream(true)
                .start();
        try {
            Thread.sleep(300);
            var stop = environment.plugin("nicocache", "stop");
            stop.add("--app-root=" + environment.app());
            stop.add("--data-root=" + environment.data());
            stop.add("--pid=" + target.pid());
            stop.add("--yes");
            assertSuccess(environment.run(stop));
            assertTrue(target.waitFor(5, TimeUnit.SECONDS), "隔離フィクスチャの停止を確認できません。");
        } finally {
            if (target.isAlive()) {
                target.destroyForcibly();
                target.waitFor(2, TimeUnit.SECONDS);
            }
        }
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
