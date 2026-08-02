package jp.roflsunriz.filtermatome.toolbox;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;

/** GUI とヘッドレス実行で共通利用するログ配信器。 */
public final class LogBus {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private final List<Consumer<String>> listeners = new CopyOnWriteArrayList<>();

    public void addListener(Consumer<String> listener) {
        listeners.add(listener);
    }

    public void removeListener(Consumer<String> listener) {
        listeners.remove(listener);
    }

    public void info(String message) {
        publish("INFO", message);
    }

    public void warn(String message) {
        publish("WARN", message);
    }

    public void error(String message) {
        publish("ERROR", message);
    }

    private void publish(String level, String message) {
        String line = "[" + OffsetDateTime.now(ZoneId.systemDefault()).format(FORMATTER) + "] ["
                + level + "] " + message;
        if (listeners.isEmpty()) {
            System.out.println(line);
            return;
        }
        for (Consumer<String> listener : listeners) {
            listener.accept(line);
        }
    }
}
