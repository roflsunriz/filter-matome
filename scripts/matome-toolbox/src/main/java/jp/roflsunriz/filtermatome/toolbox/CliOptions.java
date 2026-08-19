package jp.roflsunriz.filtermatome.toolbox;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public record CliOptions(
        boolean headless,
        boolean listPlugins,
        boolean selfTest,
        boolean guiSmoke,
        boolean help,
        String plugin,
        String action,
        List<String> inputs,
        Map<String, String> values,
        boolean recursive,
        boolean overwrite,
        boolean dryRun,
        boolean confirmed,
        Path output,
        Path dataDir,
        Path pluginsDir,
        Path repoRoot) {

    public static CliOptions parse(String[] args) {
        boolean headless = false;
        boolean listPlugins = false;
        boolean selfTest = false;
        boolean guiSmoke = false;
        boolean help = false;
        String plugin = "";
        String action = "";
        boolean recursive = false;
        boolean overwrite = false;
        boolean dryRun = false;
        boolean confirmed = false;
        Path output = null;
        Path dataDir = null;
        Path pluginsDir = null;
        Path repoRoot = null;
        List<String> inputs = new ArrayList<>();
        Map<String, String> values = new HashMap<>();

        for (int i = 0; i < args.length; i++) {
            String raw = args[i];
            String[] split = raw.split("=", 2);
            String key = split[0];
            String inline = split.length == 2 ? split[1] : null;
            switch (key) {
                case "--headless" -> headless = true;
                case "--list-plugins" -> listPlugins = true;
                case "--self-test" -> selfTest = true;
                case "--gui-smoke" -> guiSmoke = true;
                case "--help", "-h" -> help = true;
                case "--recursive", "-r" -> recursive = true;
                case "--overwrite", "-o" -> overwrite = true;
                case "--dry-run", "-d" -> dryRun = true;
                case "--yes", "--apply" -> confirmed = true;
                case "--plugin", "-p" -> {
                    plugin = valueAt(args, i, inline, key);
                    if (inline == null) i++;
                }
                case "--action", "-a" -> {
                    action = valueAt(args, i, inline, key);
                    if (inline == null) i++;
                }
                case "--input", "-i" -> {
                    inputs.add(valueAt(args, i, inline, key));
                    if (inline == null) i++;
                }
                case "--output" -> {
                    output = Path.of(valueAt(args, i, inline, key));
                    if (inline == null) i++;
                }
                case "--data-dir" -> {
                    dataDir = Path.of(valueAt(args, i, inline, key));
                    if (inline == null) i++;
                }
                case "--plugins-dir" -> {
                    pluginsDir = Path.of(valueAt(args, i, inline, key));
                    if (inline == null) i++;
                }
                case "--repo-root" -> {
                    repoRoot = Path.of(valueAt(args, i, inline, key));
                    if (inline == null) i++;
                }
                default -> {
                    if (raw.startsWith("--")) {
                        String optionName = key.substring(2);
                        String value = inline != null ? inline
                                : (i + 1 < args.length && !args[i + 1].startsWith("-") ? args[++i] : "true");
                        values.put(optionName, value);
                    } else {
                        inputs.add(raw);
                    }
                }
            }
        }
        return new CliOptions(headless, listPlugins, selfTest, guiSmoke, help, plugin, action, List.copyOf(inputs),
                Map.copyOf(values), recursive, overwrite, dryRun, confirmed, output, dataDir, pluginsDir, repoRoot);
    }

    private static String valueAt(String[] args, int index, String inline, String key) {
        if (inline != null) {
            return inline;
        }
        if (index + 1 >= args.length) {
            throw new IllegalArgumentException(key + " には値が必要です。");
        }
        return args[index + 1];
    }

    public CommandRequest request() {
        Map<String, String> requestValues = new HashMap<>(values);
        requestValues.put("headless", Boolean.toString(headless));
        return new CommandRequest(action, inputs, requestValues, recursive, overwrite, dryRun, confirmed, output);
    }
}
