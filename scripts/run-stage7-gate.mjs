import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url);
const evidenceDir = process.env.STAGE7_EVIDENCE_DIR;
const diagnosticsPath = evidenceDir === undefined ? undefined : join(evidenceDir, 'quality-diagnostics.json');
const acceptancePath = evidenceDir === undefined ? undefined : join(evidenceDir, 'acceptance-matrix.json');

const stages = [
  ['runtime-config', 'npm', ['run', 'config:validate:stage1']],
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint-and-base-policies', 'npm', ['run', 'lint']],
  ['unit', 'npm', ['run', 'test:unit']],
  ['property', 'npm', ['run', 'test:property']],
  ['integration', 'npm', ['run', 'test:integration']],
  ['secure-build', 'npm', ['run', 'build:secure']],
  ['e2e', 'npm', ['run', 'test:e2e']],
  ['stage7-policy', 'npm', ['run', 'policy:stage7']],
  ['dependency-audit', 'npm', ['run', 'audit:production']],
  ['diff-check', 'git', ['diff', '--check']],
];

const diagnostics = [];
async function persistDiagnostics() {
  if (diagnosticsPath === undefined) return;
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(diagnosticsPath, `${JSON.stringify(diagnostics)}\n`, { encoding: 'utf8', mode: 0o600 });
}

for (const [stage, command, args] of stages) {
  console.log(`[stage7] ${stage}: running`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: {
      ...process.env,
      CI: process.env.CI ?? 'true',
      ...(acceptancePath === undefined ? {} : { STAGE7_ACCEPTANCE_EVIDENCE_PATH: acceptancePath }),
    },
    stdio: 'inherit',
  });
  if (result.error) {
    diagnostics.push({ stage, passed: false, category: 'failed' });
    await persistDiagnostics();
    throw result.error;
  }
  const passed = result.status === 0;
  diagnostics.push({ stage, passed, category: passed ? 'passed' : 'failed' });
  await persistDiagnostics();
  console.log(`[stage7] ${stage}: ${passed ? 'passed' : 'failed'}`);
  if (!passed) {
    console.error(JSON.stringify({ ready: false, diagnostics }));
    process.exit(result.status ?? 1);
  }
}
console.log(JSON.stringify({ ready: true, diagnostics }));
