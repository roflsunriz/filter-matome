package jp.roflsunriz.filtermatome.toolbox.integration;

import jp.roflsunriz.filtermatome.toolbox.CommandRequest;
import jp.roflsunriz.filtermatome.toolbox.PluginContext;
import jp.roflsunriz.filtermatome.toolbox.PluginDescriptor;
import jp.roflsunriz.filtermatome.toolbox.ToolPlugin;

import javax.swing.JPanel;

/** ServiceLoaderで外部JARから検出できることを確認するテスト用プラグイン。 */
public final class ExternalTestPlugin implements ToolPlugin {
    @Override
    public PluginDescriptor descriptor() {
        return new PluginDescriptor("external-test", "外部テスト", "テスト用外部プラグイン", true, true);
    }

    @Override
    public JPanel createView(PluginContext context) {
        return new JPanel();
    }

    @Override
    public int run(CommandRequest request, PluginContext context) {
        context.log().info("external plugin: " + request.action());
        return "ping".equals(request.action()) ? 0 : 1;
    }
}
