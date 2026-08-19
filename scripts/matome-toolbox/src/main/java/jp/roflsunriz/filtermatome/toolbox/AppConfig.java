package jp.roflsunriz.filtermatome.toolbox;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Properties;

/** アプリ設定を原子的に保存し、上書き前にバックアップする。 */
public final class AppConfig {
    private final Path file;
    private final Properties properties = new Properties();

    public AppConfig(Path file) throws IOException {
        this.file = file;
        load();
    }

    private void load() throws IOException {
        if (!Files.exists(file)) {
            return;
        }
        try (InputStream input = Files.newInputStream(file)) {
            properties.load(input);
        }
    }

    public synchronized String get(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    public synchronized int getInt(String key, int defaultValue) {
        try {
            return Integer.parseInt(get(key, Integer.toString(defaultValue)).trim());
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }

    public synchronized boolean getBoolean(String key, boolean defaultValue) {
        return Boolean.parseBoolean(get(key, Boolean.toString(defaultValue)));
    }

    public synchronized void set(String key, String value) {
        if (value == null) {
            properties.remove(key);
        } else {
            properties.setProperty(key, value);
        }
    }

    public synchronized void save() throws IOException {
        Files.createDirectories(file.toAbsolutePath().getParent());
        if (Files.exists(file)) {
            Path backup = file.resolveSibling(file.getFileName() + ".bak-" + Instant.now().toEpochMilli());
            Files.copy(file, backup, StandardCopyOption.COPY_ATTRIBUTES);
        }
        Path temp = file.resolveSibling(file.getFileName() + ".tmp");
        try (OutputStream output = Files.newOutputStream(temp)) {
            properties.store(output, "matome-toolbox configuration");
        }
        try {
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ignored) {
            Files.move(temp, file, StandardCopyOption.REPLACE_EXISTING);
        }
    }
}
