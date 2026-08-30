import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const fixture = JSON.parse(await readFile(new URL('../tests/fixtures/stage1-runtime-environment.json', import.meta.url), 'utf8'));
const environment = { ...process.env, ...fixture };
const mode = process.argv[2];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: new URL('..', import.meta.url),
    env: environment,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (mode === 'validate') {
  run('npm', ['run', 'config:validate']);
} else if (mode === 'build-secure') {
  run('npx', ['next', 'build']);
  run(process.execPath, ['scripts/check-client-secrets.mjs']);
} else {
  console.error('Expected mode: validate or build-secure');
  process.exit(2);
}
