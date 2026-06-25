// Cross-platform parallel build runner without relying on shell operators.
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const viteCli = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
);

const jobs = [
  [
    'build:video-player-standalone',
    'config/vite.video-player-standalone.config.js',
  ],
  ['build:mylist2', 'config/vite.mylist2.config.js'],
  [
    'build:mlink-video-controller',
    'config/vite.mlink-video-controller.config.js',
  ],
  ['build:comment-filter2', 'config/vite.comment-filter2.config.js'],
  ['build:watch-history', 'config/vite.watch-history.config.js'],
  ['build:cache-data-manager', 'config/vite.cache-data-manager.config.js'],
  ['build:movie-info', 'config/vite.movie-info.config.js'],
  ['build:common', 'config/vite.common.config.js'],
  ['build:watch-tracker', 'config/vite.watch-tracker.config.js'],
  ['build:video-player:router', 'config/vite.video-player.config.js'],
  [
    'build:mylist2-service-worker',
    'config/vite.mylist2-service-worker.config.js',
  ],
].map(([name, config]) => ({
  name,
  command: process.execPath,
  args: [viteCli, 'build', '--config', config],
  label: `vite build --config ${config}`,
}));

const jobByName = new Map(
  jobs.map((job) => [job.name, job]),
);

if (jobByName.size !== jobs.length) {
  throw new Error('Duplicate build job names are not allowed.');
}

const jobCountByConfig = new Map();
for (const job of jobs) {
  const config = job.args.at(-1);
  jobCountByConfig.set(config, (jobCountByConfig.get(config) ?? 0) + 1);
}

for (const [config, count] of jobCountByConfig) {
  if (count > 1) {
    throw new Error(`Duplicate build config is not allowed: ${config}`);
  }
}

const requestedConcurrency = Number.parseInt(
  process.env.BUILD_CONCURRENCY ?? '',
  10,
);
const defaultConcurrency = Math.max(
  1,
  Math.min(jobs.length, os.availableParallelism?.() ?? os.cpus().length),
);
const concurrency =
  Number.isFinite(requestedConcurrency) && requestedConcurrency > 0
    ? Math.min(jobs.length, requestedConcurrency)
    : defaultConcurrency;

let nextIndex = 0;
const failures = [];
const startedAt = performance.now();

console.log(
  `[build-all] Running ${jobs.length} builds with concurrency ${concurrency}`,
);

function formatDuration(startTime) {
  const elapsedMs = performance.now() - startTime;
  return `${(elapsedMs / 1000).toFixed(2)}s`;
}

function runJob(job) {
  const startTime = performance.now();

  console.log(`[build-all] Starting: ${job.label}`);

  return new Promise((resolve) => {
    const child = spawn(job.command, job.args, { stdio: 'inherit' });

    child.on('error', (error) => {
      failures.push({
        scriptName: job.name,
        error,
        status: 1,
      });
      console.error(
        `[build-all] Failed to start ${job.name} after ${formatDuration(startTime)}`,
      );
      console.error(error);
      resolve();
    });

    child.on('close', (status, signal) => {
      if (status === 0) {
        console.log(
          `[build-all] Completed: ${job.name} (${formatDuration(startTime)})`,
        );
      } else {
        failures.push({
          scriptName: job.name,
          status: status ?? 1,
          signal,
        });
        console.error(
          `[build-all] Failed: ${job.name} status=${status ?? 'null'} signal=${signal ?? 'none'} (${formatDuration(startTime)})`,
        );
      }
      resolve();
    });
  });
}

async function runNext() {
  while (nextIndex < jobs.length) {
    const job = jobs[nextIndex];
    nextIndex += 1;
    await runJob(job);
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
