package jp.roflsunriz.filtermatome.toolbox;

public record PluginDescriptor(
        String id,
        String name,
        String description,
        boolean supportsGui,
        boolean supportsHeadless) {
}
