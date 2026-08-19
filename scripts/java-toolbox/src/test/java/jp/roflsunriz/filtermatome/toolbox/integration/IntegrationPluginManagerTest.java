package jp.roflsunriz.filtermatome.toolbox.integration;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginManager;
import jp.roflsunriz.filtermatome.toolbox.TestSupport;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.jar.JarEntry;
import java.util.jar.JarOutputStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IntegrationPluginManagerTest {
    @TempDir
    Path temp;

    @Test
    void discoversBuiltInsAndServiceLoaderPluginFromDataDirectory() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        Path data = Files.createDirectories(temp.resolve("data"));
        Path pluginJar = data.resolve("plugins").resolve("external-test.jar");
        writePluginJar(pluginJar);
        PluginContext context = TestSupport.context(data, repo);

        try (PluginManager manager = new PluginManager(context)) {
            manager.discover();

            assertEquals(5, manager.all().size());
            assertNotNull(manager.find("media"));
            assertNotNull(manager.find("external-test"));
            CommandRequest request = TestSupport.request("ping", List.of(), Map.of(), false, false, true, true, null);
            assertEquals(0, manager.run("external-test", request));
        }
    }

    @Test
    void routesDeveloperSymlinkActionThroughThePluginManager() throws Exception {
        Path repo = Files.createDirectories(temp.resolve("repo"));
        Path target = Files.createDirectories(temp.resolve("target"));
        Files.createDirectories(repo.resolve("scripts"));
        Files.createDirectories(target.resolve("scripts"));
        PluginContext context = TestSupport.context(temp.resolve("data"), repo);
        var logs = TestSupport.captureLogs(context.log());

        try (PluginManager manager = new PluginManager(context)) {
            manager.discover();
            CommandRequest request = TestSupport.request("links", List.of(), Map.of(
                    "source-root", repo.toString(), "target-root", target.toString()),
                    false, false, true, false, null);
            assertEquals(0, manager.run("developer", request));
            assertTrue(logs.stream().anyMatch(line -> line.contains("DRY-RUN:")
                    && line.contains("scripts")));
        }
    }

    private static void writePluginJar(Path jar) throws Exception {
        String classEntry = ExternalTestPlugin.class.getName().replace('.', '/') + ".class";
        String serviceEntry = "META-INF/services/jp.roflsunriz.filtermatome.toolbox.ToolPlugin";
        Files.createDirectories(jar.getParent());
        try (JarOutputStream output = new JarOutputStream(Files.newOutputStream(jar))) {
            output.putNextEntry(new JarEntry(classEntry));
            try (InputStream input = ExternalTestPlugin.class.getResourceAsStream("/" + classEntry)) {
                assertNotNull(input);
                input.transferTo(output);
            }
            output.closeEntry();
            output.putNextEntry(new JarEntry(serviceEntry));
            output.write((ExternalTestPlugin.class.getName() + System.lineSeparator())
                    .getBytes(java.nio.charset.StandardCharsets.UTF_8));
            output.closeEntry();
        }
        assertTrue(Files.size(jar) > 0);
    }
}
