package jp.roflsunriz.filtermatome.toolbox;

import javax.swing.JComponent;

/** 外部JARからもServiceLoaderで追加できるプラグインSPI。 */
public interface ToolPlugin {
    PluginDescriptor descriptor();

    JComponent createView(PluginContext context);

    int run(CommandRequest request, PluginContext context) throws Exception;

    default String readme() {
        try (var input = getClass().getResourceAsStream("/README.md")) {
            if (input != null) {
                return new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            }
        } catch (java.io.IOException ignored) {
            // 読み込めない場合はマニフェストの説明へフォールバックする。
        }
        return descriptor().description();
    }
}
