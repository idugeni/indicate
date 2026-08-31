import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { REQUIRED_SCHEMA_VERSION } from '../src/application/deployment/schema-gate';
import { createStage7ReadinessFixture } from '../src/domain/stage7/readiness-fixtures';
import { validateProductionReadiness } from '../src/application/stage7/production-readiness';
import { validateRuntimeConfig } from '../src/config/schema';
import { ProductionReadinessAdapter } from '../src/infrastructure/deployment/production-readiness-adapter';

async function emit(output: Readonly<Record<string, unknown>>, success: boolean): Promise<void> {
  const evidencePath = process.env.STAGE7_READINESS_EVIDENCE_PATH;
  if (evidencePath !== undefined) {
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify(output)}\n`, { encoding: 'utf8', mode: 0o600 });
  }
  if (success) console.log(JSON.stringify(output));
  else {
    console.error(JSON.stringify(output));
    process.exitCode = 1;
  }
}

const parsed = validateRuntimeConfig(process.env);
if (!parsed.success) {
  await emit({
    ready: false,
    requiredSchemaVersion: REQUIRED_SCHEMA_VERSION,
    checks: [{ name: 'runtime_configuration', status: 'failed', category: 'runtime_configuration_invalid' }],
    issues: parsed.issues,
  }, false);
} else if (process.env.NODE_ENV !== 'production' || parsed.config.schemaGateMode !== 'live') {
  await emit({
    ready: false,
    requiredSchemaVersion: REQUIRED_SCHEMA_VERSION,
    checks: [{ name: 'runtime_configuration', status: 'failed', category: 'production_live_mode_required' }],
  }, false);
} else {
  const fixture = createStage7ReadinessFixture(parsed.config);
  const report = await validateProductionReadiness(parsed.config, fixture, new ProductionReadinessAdapter(parsed.config));
  await emit({ ready: report.ready, requiredSchemaVersion: report.requiredSchemaVersion, checks: report.checks }, report.ready);
}
