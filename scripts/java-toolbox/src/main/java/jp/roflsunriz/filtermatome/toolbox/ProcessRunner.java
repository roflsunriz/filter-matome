package jp.roflsunriz.filtermatome.toolbox;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

/** シェルを経由せず、OSに依存しない外部コマンド実行。 */
public final class ProcessRunner {
    public ProcessResult run(
            List<String> command,
            Path workingDirectory,
            LogBus log,
            CancellationToken token) throws IOException, InterruptedException {
        log.info("実行: " + format(command));
        ProcessBuilder builder = new ProcessBuilder(command)
                .redirectErrorStream(true);
        if (workingDirectory != null) {
            builder.directory(workingDirectory.toFile());
        }
        Process process = builder.start();
        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            while (true) {
                while (reader.ready()) {
                    String line = reader.readLine();
                    if (line == null) {
                        break;
                    }
                    output.append(line).append(System.lineSeparator());
                    log.info(line);
                }
                if (token.isCancelled()) {
                    destroy(process);
                    log.warn("処理をキャンセルしました。");
                    return new ProcessResult(130, output.toString());
                }
                if (process.waitFor(100, TimeUnit.MILLISECONDS)) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        output.append(line).append(System.lineSeparator());
                        log.info(line);
                    }
                    return new ProcessResult(process.exitValue(), output.toString());
                }
            }
        }
    }

    public ProcessResult capture(List<String> command, Path workingDirectory) throws IOException, InterruptedException {
        ProcessBuilder builder = new ProcessBuilder(command)
                .redirectErrorStream(true);
        if (workingDirectory != null) {
            builder.directory(workingDirectory.toFile());
        }
        Process process = builder.start();
        String output;
        try (var input = process.getInputStream()) {
            output = new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
        return new ProcessResult(process.waitFor(), output);
    }

    public static String format(List<String> command) {
        return command.stream()
                .map(ProcessRunner::quote)
                .reduce((a, b) -> a + " " + b)
                .orElse("");
    }

    private static String quote(String value) {
        if (value.matches("[A-Za-z0-9_./:+=@%-]+")) {
            return value;
        }
        return "\"" + value.replace("\"", "\\\"") + "\"";
    }

    private static void destroy(Process process) {
        process.descendants().forEach(handle -> handle.destroyForcibly());
        process.destroy();
        try {
            if (!process.waitFor(2, TimeUnit.SECONDS)) {
                process.destroyForcibly();
            }
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
    }
}
