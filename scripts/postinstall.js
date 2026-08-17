'use strict';

const { spawnSync } = require('child_process');

const omittedDependencies = String(process.env.npm_config_omit || '')
  .split(/[\s,]+/)
  .filter(Boolean);

// CI installs and builds the two packages in explicit, cacheable steps. A
// production-only server install does not need frontend build dependencies.
if (process.env.CI || omittedDependencies.includes('dev')) {
  process.exit(0);
}

const npmCliPath = process.env.npm_execpath;

function run(args) {
  const command = npmCliPath ? process.execPath : 'npm';
  const commandArgs = npmCliPath ? [npmCliPath, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    shell: !npmCliPath && process.platform === 'win32',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

run(['--prefix', 'frontend', 'install']);
run(['--prefix', 'frontend', 'run', 'build']);
