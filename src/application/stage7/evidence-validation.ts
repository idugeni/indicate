import { REQUIRED_SCHEMA_VERSION } from '@/application/deployment/schema-gate';
import { PRODUCTION_READINESS_CHECK_ORDER } from '@/application/stage7/production-readiness';
import { STAGE7_QUALITY_STAGES } from '@/application/stage7/release-gate';
import type { ProductionReadinessReport, QualityGateDiagnostic, Stage7AcceptanceReport } from '@/domain/stage7/models';

function record(value: unknown, code: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], code: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) throw new Error(code);
}

export function parseProductionReadinessEvidence(value: unknown): ProductionReadinessReport {
  const candidate = record(value, 'readiness_evidence_invalid');
  exactKeys(candidate, ['ready', 'requiredSchemaVersion', 'checks'], 'readiness_evidence_invalid');
  if (typeof candidate.ready !== 'boolean' || candidate.requiredSchemaVersion !== REQUIRED_SCHEMA_VERSION || !Array.isArray(candidate.checks)) {
    throw new Error('readiness_evidence_invalid');
  }
  const expectedNames = new Set<string>(PRODUCTION_READINESS_CHECK_ORDER);
  const observedNames = new Set<string>();
  const checks = candidate.checks.map((value) => {
    const check = record(value, 'readiness_evidence_invalid');
    exactKeys(check, ['name', 'status', 'category'], 'readiness_evidence_invalid');
    if (typeof check.name !== 'string' || !expectedNames.has(check.name) || observedNames.has(check.name)
      || check.status !== 'passed' || check.category !== 'ready') throw new Error('readiness_evidence_invalid');
    observedNames.add(check.name);
    return Object.freeze({ name: check.name as ProductionReadinessReport['checks'][number]['name'], status: 'passed' as const, category: 'ready' });
  });
  const ready = checks.length === expectedNames.size && observedNames.size === expectedNames.size;
  if (!ready || candidate.ready !== ready) throw new Error('readiness_evidence_invalid');
  return Object.freeze({ ready, requiredSchemaVersion: REQUIRED_SCHEMA_VERSION, checks: Object.freeze(checks) });
}

export function parseStage7AcceptanceEvidence(value: unknown): Stage7AcceptanceReport {
  const candidate = record(value, 'acceptance_evidence_invalid');
  exactKeys(candidate, ['accepted', 'scenarioCount', 'failures'], 'acceptance_evidence_invalid');
  if (typeof candidate.accepted !== 'boolean' || candidate.scenarioCount !== 9 || !Array.isArray(candidate.failures)
    || candidate.failures.some((failure) => typeof failure !== 'string')) throw new Error('acceptance_evidence_invalid');
  const accepted = candidate.scenarioCount === 9 && candidate.failures.length === 0;
  if (!accepted || candidate.accepted !== accepted) throw new Error('acceptance_evidence_invalid');
  return Object.freeze({ accepted, scenarioCount: 9, failures: Object.freeze([]) });
}

export function parseQualityGateEvidence(value: unknown): readonly QualityGateDiagnostic[] {
  if (!Array.isArray(value)) throw new Error('quality_evidence_invalid');
  const expectedStages = new Set<string>(STAGE7_QUALITY_STAGES);
  const observedStages = new Set<string>();
  const diagnostics = value.map((item) => {
    const diagnostic = record(item, 'quality_evidence_invalid');
    exactKeys(diagnostic, ['stage', 'passed', 'category'], 'quality_evidence_invalid');
    if (typeof diagnostic.stage !== 'string' || !expectedStages.has(diagnostic.stage) || observedStages.has(diagnostic.stage)
      || diagnostic.passed !== true || diagnostic.category !== 'passed') throw new Error('quality_evidence_invalid');
    observedStages.add(diagnostic.stage);
    return Object.freeze({ stage: diagnostic.stage, passed: true, category: 'passed' });
  });
  if (diagnostics.length !== expectedStages.size || observedStages.size !== expectedStages.size) throw new Error('quality_evidence_invalid');
  return Object.freeze(diagnostics);
}
