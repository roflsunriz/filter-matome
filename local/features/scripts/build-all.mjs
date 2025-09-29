// Cross-platform sequential build runner without relying on shell operators
import { spawnSync } from 'node:child_process';

// Build a robust npm command that works on Windows/POSIX and inside Node
function getNpmInvokeCommand(scriptName) {
  // Prefer npm_execpath to avoid PATH/cmd issues
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && process.execPath) {
    // Execute: node <npmExecPath> run <script>
    const nodePath = process.execPath.includes(' ') ? `"${process.execPath}"` : process.execPath;
    const npmPath = npmExecPath.includes(' ') ? `"${npmExecPath}"` : npmExecPath;
    return `${nodePath} ${npmPath} run ${scriptName}`;
  }
  // Fallback to npm(.cmd)
  const base = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  return `${base} run ${scriptName}`;
}

const scripts = [
  'build:mylist2',
  'build:mylist2-service-worker',
  'build:comment-filter2-docs',
  'build:video-player',
  'build:video-player-standalone',
  'build:common',
  'build:mlink-video-controller',
  'build:comment-filter2',
  'build:mylist2-docs',
  'build:watch-tracker',
  'build:watch-history',
  'build:cache-data-manager',
  'build:movie-info',
];
for (const scriptName of scripts) {
  const cmd = getNpmInvokeCommand(scriptName);
  console.log(`[build-all] Running: ${cmd}`);
  const result = spawnSync(cmd, { stdio: 'inherit', shell: true });
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


