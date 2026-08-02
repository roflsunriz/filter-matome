package jp.roflsunriz.filtermatome.toolbox;

public record ProcessResult(int exitCode, String output) {
    public boolean succeeded() {
        return exitCode == 0;
    }
}
