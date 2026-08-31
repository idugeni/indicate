import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { decidePromotion } from '../src/application/stage7/release-gate';
import {
  parseProductionReadinessEvidence,
  parseQualityGateEvidence,
  parseStage7AcceptanceEvidence,
} from '../src/application/stage7/evidence-validation';
import { REQUIRED_SCHEMA_VERSION } from '../src/application/deployment/schema-gate';
import type { ProductionReadinessReport, QualityGateDiagnostic, Stage7AcceptanceReport } from '../src/domain/stage7/models';

const evidenceDir = process.env.STAGE7_EVIDENCE_DIR ?? '.stage7-evidence';
const readJson = async (name: string): Promise<unknown> => JSON.parse(await readFile(join(evidenceDir, name), 'utf8')) as unknown;


let readinessEvidence: ProductionReadinessReport = { ready: false, requiredSchemaVersion: REQUIRED_SCHEMA_VERSION, checks: [] };
let acceptanceEvidence: Stage7AcceptanceReport = { accepted: false, scenarioCount: 0, failures: ['evidence_unavailable'] };
let diagnosticEvidence: readonly QualityGateDiagnostic[] = [];
const evidenceFailures: string[] = [];
try { readinessEvidence = parseProductionReadinessEvidence(await readJson('production-readiness.json')); } catch { evidenceFailures.push('production_readiness_evidence'); }
try { acceptanceEvidence = parseStage7AcceptanceEvidence(await readJson('acceptance-matrix.json')); } catch { evidenceFailures.push('acceptance_evidence'); }
try { diagnosticEvidence = parseQualityGateEvidence(await readJson('quality-diagnostics.json')); } catch { evidenceFailures.push('quality_evidence'); }

const decision = decidePromotion({ readiness: readinessEvidence, acceptance: acceptanceEvidence, diagnostics: diagnosticEvidence });
const artifact = Object.freeze({
  decision: Object.freeze({ promote: decision.promote && evidenceFailures.length === 0, failures: Object.freeze([...new Set([...decision.failures, ...evidenceFailures])].sort()) }),
  readiness: Object.freeze({ ready: readinessEvidence.ready, requiredSchemaVersion: readinessEvidence.requiredSchemaVersion, checks: readinessEvidence.checks }),
  acceptance: acceptanceEvidence,
  diagnostics: diagnosticEvidence,
});
const artifactPath = join(evidenceDir, 'promotion-decision.json');
await writeFile(artifactPath, `${JSON.stringify(artifact)}\n`, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify(artifact));
if (!artifact.decision.promote) process.exitCode = 1;
