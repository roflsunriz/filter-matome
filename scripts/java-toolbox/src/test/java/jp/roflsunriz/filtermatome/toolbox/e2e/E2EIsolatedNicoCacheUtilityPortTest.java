package jp.roflsunriz.filtermatome.toolbox.e2e;

import jp.roflsunriz.filtermatome.toolbox.ProcessResult;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** 旧nicocache-utility.pyの未移行メニューを実機から隔離して検証する。 */
class E2EIsolatedNicoCacheUtilityPortTest {
    @TempDir
    Path temp;

    @Test
    void migratedProcessBuildLaunchCompileAndJavaHomeActionsUseOnlyFixtureTools() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        prepareFixture(environment);
        Path fakeJava = environment.tool("java");
        Path fakeJavac = environment.tool("javac");

        assertSuccess(environment.run(nico(environment, "launch-headless", fakeJava, fakeJavac, "--yes")));
        assertSuccess(environment.run(nico(environment, "launch-gui", fakeJava, fakeJavac, "--yes")));
        assertSuccess(environment.run(nico(environment, "force-stop", fakeJava, fakeJavac, "--yes")));

        assertSuccess(environment.run(nico(environment, "build-java-apps", fakeJava, fakeJavac, "--yes", "--clean")));

        ProcessResult firstCompile = environment.run(nico(environment, "compile-java-files", fakeJava, fakeJavac, "--yes"));
        assertSuccess(firstCompile);
        assertTrue(Files.isRegularFile(environment.repo().resolve("extensions/TestExtension.class")));
        assertFalse(Files.exists(environment.repo().resolve("extensions/nlMovieFetcher.class")));
        assertFalse(Files.exists(environment.repo().resolve("extensions/SampleExtension.class")));

        assertSuccess(environment.run(nico(environment, "compile-java-files", fakeJava, fakeJavac,
                "--yes", "--include-movie-fetcher")));
        assertTrue(Files.isRegularFile(environment.repo().resolve("extensions/nlMovieFetcher.class")));

        Path jdk = Files.createDirectories(environment.root().resolve("jdks/jdk-17.0.99/bin"));
        Files.writeString(jdk.resolve("java.exe"), "fake java");
        Files.writeString(jdk.resolve("javac.exe"), "fake javac");
        Path fakeSetx = environment.tool("setx");
        assertSuccess(environment.run(nico(environment, "set-java-home", fakeJava, fakeJavac,
                "--jdk-root=" + jdk.getParent().getParent(), "--setx=" + fakeSetx, "--yes"),
                Map.of(), Map.of("filterMatome.toolbox.test.platform", "windows")));

        Path portableJdk = Files.createDirectories(environment.root().resolve("portable-jdk/jdk-21.0.1/bin"));
        Files.writeString(portableJdk.resolve("java"), "fake java");
        Files.writeString(portableJdk.resolve("javac"), "fake javac");
        Path envFile = environment.home().resolve("java-home.env");
        assertSuccess(environment.run(nico(environment, "set-java-home", fakeJava, fakeJavac,
                "--jdk-root=" + portableJdk.getParent().getParent(), "--env-file=" + envFile, "--yes"),
                Map.of(), Map.of("filterMatome.toolbox.test.platform", "linux")));
        assertTrue(Files.readString(envFile).contains("JAVA_HOME='" + portableJdk.getParent()
                + "'"), "POSIX環境ファイルへJAVA_HOMEが保存されていません。");

        String toolLog = environment.toolLogText();
        assertTrue(toolLog.contains("java\t-jar\t" + environment.app().resolve("NicoCacheBuild.jar")),
                "PowerShellではなくNicoCacheBuild.jarのJava境界を通っていません。\n" + toolLog);
        assertTrue(toolLog.contains("java\t-jar\t" + environment.app().resolve("NicoCacheLauncher.jar")
                + "\t--headless\t--force-stop"), toolLog);
        assertTrue(toolLog.contains("setx\tJAVA_HOME\t" + jdk.getParent().getParent().resolve("jdk-17.0.99")), toolLog);
    }

    @Test
    void migratedWindowsMenusAndWebMenusAreDryRunSafeInAnIsolatedProcess() throws Exception {
        IsolatedEnvironment environment = new IsolatedEnvironment(temp);
        prepareFixture(environment);
        Path fakeJava = environment.tool("java");
        Path fakeJavac = environment.tool("javac");
        Map<String, String> windows = Map.of("filterMatome.toolbox.test.platform", "windows");

        for (String action : List.of("java-version", "admin-check", "open-uploader", "open-wiki", "open-bbs",
                "open-bouncycastle", "open-adoptium", "open-environment", "open-proxy-settings",
                "open-certificate-manager", "open-task-scheduler")) {
            var arguments = nico(environment, action, fakeJava, fakeJavac, "--dry-run");
            ProcessResult result = environment.run(arguments, Map.of(), windows);
            assertSuccess(result);
            assertTrue(result.output().contains("DRY-RUN") || result.output().contains("fake-java"),
                    action + "のヘッドレス結果に計画がありません: " + result.output());
        }

        ProcessResult nonWindows = environment.run(
                nico(environment, "open-certificate-manager", fakeJava, fakeJavac, "--dry-run"),
                Map.of(), Map.of("filterMatome.toolbox.test.platform", "linux"));
        assertNotZero(nonWindows);
    }

    private static void prepareFixture(IsolatedEnvironment environment) throws IOException {
        Files.writeString(environment.app().resolve("NicoCache_nl.jar"), "fake application");
        Files.writeString(environment.app().resolve("NicoCacheLauncher.jar"), "fake launcher");
        Files.writeString(environment.app().resolve("NicoCacheBuild.jar"), "fake build tool");
        Files.writeString(environment.app().resolve("NicoCacheCA.jar"), "fake certificate tool");
        Files.writeString(environment.app().resolve("certificate-targets.txt"), "isolated target\n");
        Files.createDirectories(environment.data().resolve("extensions"));
        Files.createDirectories(environment.data().resolve("local"));
        Files.createDirectories(environment.data().resolve("nlFilters"));
        Files.createDirectories(environment.repo().resolve("extensions"));
        Files.writeString(environment.repo().resolve("extensions/TestExtension.java"),
                "public class TestExtension { }");
        Files.writeString(environment.repo().resolve("extensions/nlMovieFetcher.java"),
                "public class nlMovieFetcher { }");
        Files.writeString(environment.repo().resolve("extensions/SampleExtension.java"),
                "public class SampleExtension { }");
    }

    private static List<String> nico(IsolatedEnvironment environment, String action,
                                     Path java, Path javac, String... extra) throws IOException {
        var arguments = environment.plugin("nicocache", action);
        arguments.add("--app-root=" + environment.app());
        arguments.add("--data-root=" + environment.data());
        arguments.add("--source-root=" + environment.repo());
        arguments.add("--java=" + java);
        arguments.add("--javac=" + javac);
        arguments.addAll(List.of(extra));
        return arguments;
    }

    private static void assertSuccess(ProcessResult result) {
        assertEquals(0, result.exitCode(), result.output());
    }

    private static void assertNotZero(ProcessResult result) {
        assertTrue(result.exitCode() != 0, result.output());
    }
}
