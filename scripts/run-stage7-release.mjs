import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { prepareStage7EvidenceDirectory } from './stage7-evidence-directory.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const evidenceDir = await prepareStage7EvidenceDirectory(root, process.env.STAGE7_EVIDENCE_DIR);
const environment = { ...process.env, STAGE7_EVIDENCE_DIR: evidenceDir };

const gate = spawnSync('node', ['scripts/run-stage7-gate.mjs'], { cwd: root, env: environment, stdio: 'inherit' });
if (gate.error) throw gate.error;
if (gate.status === 0) {
  const readiness = spawnSync('npm', ['run', 'readiness:production'], {
    cwd: root,
    env: { ...environment, STAGE7_READINESS_EVIDENCE_PATH: join(evidenceDir, 'production-readiness.json') },
    stdio: 'inherit',
  });
  if (readiness.error) throw readiness.error;
} else {
  await writeFile(join(evidenceDir, 'production-readiness.json'), `${JSON.stringify({ ready: false, requiredSchemaVersion: 14, checks: [{ name: 'runtime_configuration', status: 'failed', category: 'quality_gate_failed' }] })}\n`, { encoding: 'utf8', mode: 0o600 });
}

const decision = spawnSync('npx', ['tsx', 'scripts/decide-stage7-promotion.ts'], { cwd: root, env: environment, stdio: 'inherit' });
if (decision.error) throw decision.error;
process.exitCode = decision.status ?? 1;
