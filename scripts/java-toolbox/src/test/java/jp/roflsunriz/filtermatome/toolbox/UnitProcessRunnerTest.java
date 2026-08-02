package jp.roflsunriz.filtermatome.toolbox;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UnitProcessRunnerTest {
    @Test
    void runCapturesDelayedOutputAndExitCode() throws Exception {
        LogBus log = new LogBus();
        List<String> lines = TestSupport.captureLogs(log);
        ProcessResult result = new ProcessRunner().run(TestSupport.javaCommand("delayed"), null, log,
                new CancellationToken());

        assertEquals(0, result.exitCode());
        assertTrue(result.output().contains("first"));
        assertTrue(result.output().contains("second"));
        assertTrue(lines.stream().anyMatch(line -> line.contains("実行:")));
    }

    @Test
    void runDoesNotDeadlockOnLargeOutputAndCapturePreservesFailure() throws Exception {
        ProcessRunner runner = new ProcessRunner();
        LogBus log = new LogBus();
        TestSupport.captureLogs(log);
        ProcessResult many = runner.run(TestSupport.javaCommand("many", "12000"), null, log,
                new CancellationToken());
        ProcessResult failed = runner.capture(TestSupport.javaCommand("exit", "7"), null);

        assertEquals(0, many.exitCode());
        assertTrue(many.output().contains("line-11999"));
        assertEquals(7, failed.exitCode());
        assertTrue(ProcessRunner.format(List.of("tool", "path with space", "quote\"value"))
                .contains("\"path with space\""));
    }

    @Test
    void cancellationTerminatesLongRunningProcess() throws Exception {
        CancellationToken token = new CancellationToken();
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            var future = executor.submit(() -> new ProcessRunner().run(TestSupport.javaCommand("sleep"), null,
                    new LogBus(), token));
            Thread.sleep(300);
            token.cancel();
            ProcessResult result = future.get(10, TimeUnit.SECONDS);
            assertEquals(130, result.exitCode());
            assertTrue(result.output().contains("sleeping"));
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(5, TimeUnit.SECONDS);
        }
    }
}
