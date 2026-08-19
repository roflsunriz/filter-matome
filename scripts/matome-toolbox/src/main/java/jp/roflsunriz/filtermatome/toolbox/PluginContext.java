package jp.roflsunriz.filtermatome.toolbox;

import java.nio.file.Path;

public record PluginContext(
        AppPaths paths,
        AppConfig config,
        ProcessRunner processes,
        LogBus log) {

    public Path repo(String relative) {
        return paths.resolveRepo(relative);
    }
}
