package jp.roflsunriz.filtermatome.toolbox;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public record CommandRequest(
        String action,
        List<String> inputs,
        Map<String, String> values,
        boolean recursive,
        boolean overwrite,
        boolean dryRun,
        boolean confirmed,
        Path output) {

    public String value(String key, String defaultValue) {
        return values.getOrDefault(key, defaultValue);
    }

    public boolean flag(String key) {
        return Boolean.parseBoolean(values.getOrDefault(key, "false"));
    }
}
