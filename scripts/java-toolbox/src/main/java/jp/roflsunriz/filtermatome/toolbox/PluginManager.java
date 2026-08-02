package jp.roflsunriz.filtermatome.toolbox;

import jp.roflsunriz.filtermatome.toolbox.plugins.ConfigEditorPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.DeveloperPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.MediaPlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.NicoCachePlugin;
import jp.roflsunriz.filtermatome.toolbox.plugins.UpdaterPlugin;

import java.io.IOException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.ServiceLoader;

public final class PluginManager implements AutoCloseable {
    private final PluginContext context;
    private final LinkedHashMap<String, ToolPlugin> plugins = new LinkedHashMap<>();
    private final List<URLClassLoader> loaders = new ArrayList<>();

    public PluginManager(PluginContext context) {
        this.context = context;
    }

    public void discover() throws IOException {
        register(new MediaPlugin());
        register(new ConfigEditorPlugin());
        register(new UpdaterPlugin());
        register(new NicoCachePlugin());
        register(new DeveloperPlugin());
        if (!Files.isDirectory(context.paths().pluginsDir())) {
            return;
        }
        try (var jars = Files.list(context.paths().pluginsDir())) {
            for (Path jar : jars.filter(path -> path.toString().toLowerCase().endsWith(".jar")).toList()) {
                URLClassLoader loader = new URLClassLoader(new URL[]{jar.toUri().toURL()}, Main.class.getClassLoader());
                loaders.add(loader);
                for (ToolPlugin plugin : ServiceLoader.load(ToolPlugin.class, loader)) {
                    register(plugin);
                }
            }
        }
    }

    private void register(ToolPlugin plugin) {
        String id = plugin.descriptor().id();
        if (id == null || id.isBlank() || plugins.containsKey(id)) {
            context.log().warn("重複または空のプラグインIDをスキップしました: " + id);
            return;
        }
        if (!context.config().getBoolean("plugin." + id + ".enabled", true)) {
            context.log().info("無効化されたプラグインをスキップしました: " + id);
            return;
        }
        plugins.put(id, plugin);
    }

    public List<ToolPlugin> all() {
        return List.copyOf(plugins.values());
    }

    public ToolPlugin find(String id) {
        return plugins.get(id);
    }

    public int run(String pluginId, CommandRequest request) throws Exception {
        if (request.action() == null || request.action().isBlank()) {
            throw new IllegalArgumentException("--action を指定してください。");
        }
        ToolPlugin plugin = find(pluginId);
        if (plugin == null) {
            throw new IllegalArgumentException("プラグインが見つかりません: " + pluginId);
        }
        return plugin.run(request, context);
    }

    @Override
    public void close() {
        for (URLClassLoader loader : loaders) {
            try {
                loader.close();
            } catch (IOException exception) {
                context.log().warn("プラグインローダーを閉じられませんでした: " + exception.getMessage());
            }
        }
    }
}
