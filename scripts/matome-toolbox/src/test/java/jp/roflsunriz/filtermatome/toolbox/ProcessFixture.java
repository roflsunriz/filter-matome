package jp.roflsunriz.filtermatome.toolbox;

/** ProcessRunnerとCLIの子プロセス検証に使う、標準ライブラリだけの実行器。 */
public final class ProcessFixture {
    private ProcessFixture() {
    }

    public static void main(String[] args) throws Exception {
        String action = args.length == 0 ? "delayed" : args[0];
        switch (action) {
            case "version" -> System.out.println("fixture-version");
            case "delayed" -> {
                System.out.println("first");
                System.out.flush();
                Thread.sleep(250);
                System.out.println("second");
                System.out.flush();
            }
            case "sleep" -> {
                System.out.println("sleeping");
                System.out.flush();
                Thread.sleep(30_000);
            }
            case "many" -> {
                int count = args.length > 1 ? Integer.parseInt(args[1]) : 10_000;
                for (int i = 0; i < count; i++) {
                    System.out.println("line-" + i);
                }
            }
            case "exit" -> System.exit(args.length > 1 ? Integer.parseInt(args[1]) : 1);
            default -> throw new IllegalArgumentException("unknown fixture action: " + action);
        }
    }
}
