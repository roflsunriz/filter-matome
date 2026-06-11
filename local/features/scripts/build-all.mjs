// Cross-platform parallel build runner without relying on shell operators.
import os from 'node:os';
import { spawn } from 'node:child_process';

const command = 'bun';

const scripts = [
  'build:mylist2',
  'build:mylist2-service-worker',
  'build:video-player',
  'build:common',
  'build:mlink-video-controller',
  'build:comment-filter2',
  'build:watch-tracker',
  'build:watch-history',
  'build:cache-data-manager',
  'build:movie-info',
];

const requestedConcurrency = Number.parseInt(
  process.env.BUILD_CONCURRENCY ?? '',
  10,
);
const defaultConcurrency = Math.max(
  1,
  Math.min(scripts.length, os.availableParallelism?.() ?? os.cpus().length),
);
const concurrency =
  Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
    ? Math.min(scripts.length, requestedConcurrency)
    : defaultConcurrency;

let nextIndex = 0;
const failures = [];
const startedAt = performance.now();

console.log(
  `[build-all] Running ${scripts.length} builds with concurrency ${concurrency}`,
);

function formatDuration(startTime) {
  const elapsedMs = performance.now() - startTime;
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function runScript(scriptName) {
  const args = ['run', scriptName];
  const startTime = performance.now();

  console.log(`[build-all] Starting: ${command} ${args.join(' ')}`);

  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit' });

    child.on('error', (error) => {
      failures.push({
        scriptName,
        error,
        status: 1,
      });
      console.error(
        `[build-all] Failed to start ${scriptName} after ${formatDuration(startTime)}`,
      );
      console.error(error);
      resolve();
    });

    child.on('close', (status, signal) => {
      if (status === 0) {
        console.log(
          `[build-all] Completed: ${scriptName} (${formatDuration(startTime)})`,
        );
      } else {
        failures.push({
          scriptName,
          status: status ?? 1,
          signal,
        });
        console.error(
          `[build-all] Failed: ${scriptName} status=${status ?? 'null'} signal=${signal ?? 'none'} (${formatDuration(startTime)})`,
        );
      }
      resolve();
    });
  });
}

async function runNext() {
  while (nextIndex < scripts.length) {
    const scriptName = scripts[nextIndex];
    nextIndex += 1;
    await runScript(scriptName);
  }
}

await Promise.all(
  Array.from({ length: concurrency }, () => runNext()),
);

if (failures.length > 0) {
  console.error('[build-all] Build failed');
  for (const failure of failures) {
    console.error(
      `[build-all] - ${failure.scriptName}: status=${failure.status ?? 'null'} signal=${failure.signal ?? 'none'}`,
    );
  }
  process.exit(failures[0].status ?? 1);
}

console.log(
  `[build-all] All builds completed successfully (${formatDuration(startedAt)})`,
);
