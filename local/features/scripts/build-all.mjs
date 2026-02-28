// Cross-platform sequential build runner without relying on shell operators
import { spawnSync } from 'node:child_process';

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
for (const scriptName of scripts) {
  const args = ['run', scriptName];
  console.log(`[build-all] Running: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`[build-all] Failed to start command: ${cmd}`);
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[build-all] Command failed with status ${result.status}: ${cmd}`);
    process.exit(result.status ?? 1);
  }
}

console.log('[build-all] All builds completed successfully');
process.exit(0);


