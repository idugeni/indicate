import { REQUIRED_SCHEMA_VERSION } from '@/application/deployment/schema-gate';
import { PRODUCTION_READINESS_CHECK_ORDER } from '@/application/stage7/production-readiness';
import type {
  ProductionReadinessReport,
  PromotionDecision,
  QualityGateDiagnostic,
  RollbackEvidence,
  Stage7AcceptanceReport,
} from '@/domain/stage7/models';

export const STAGE7_QUALITY_STAGES = Object.freeze([
  'runtime-config',
  'typecheck',
  'lint-and-base-policies',
  'unit',
  'property',
  'integration',
  'secure-build',
  'e2e',
  'stage7-policy',
  'dependency-audit',
  'diff-check',
] as const);

export function decidePromotion(input: {
  readonly readiness: ProductionReadinessReport;
  readonly acceptance: Stage7AcceptanceReport;
  readonly diagnostics: readonly QualityGateDiagnostic[];
}): PromotionDecision {
  const failures = new Set<string>();
  const readinessNames = input.readiness.checks.map(({ name }) => name);
  const readinessComplete = input.readiness.requiredSchemaVersion === REQUIRED_SCHEMA_VERSION
    && readinessNames.length === PRODUCTION_READINESS_CHECK_ORDER.length
    && new Set(readinessNames).size === readinessNames.length
    && PRODUCTION_READINESS_CHECK_ORDER.every((name) => readinessNames.includes(name));
  const readinessDerived = readinessComplete
    && input.readiness.checks.every(({ status, category }) => status === 'passed' && category === 'ready');
  if (!readinessDerived || input.readiness.ready !== readinessDerived) failures.add('production_readiness');
  const acceptanceDerived = input.acceptance.scenarioCount === 9 && input.acceptance.failures.length === 0;
  if (!acceptanceDerived || input.acceptance.accepted !== acceptanceDerived) failures.add('acceptance_matrix');
  const expectedStages = new Set<string>(STAGE7_QUALITY_STAGES);
  const observedStages = input.diagnostics.map(({ stage }) => stage);
  if (observedStages.length !== expectedStages.size || new Set(observedStages).size !== observedStages.length
    || observedStages.some((stage) => !expectedStages.has(stage))
    || STAGE7_QUALITY_STAGES.some((stage) => !observedStages.includes(stage))) failures.add('quality_gate_incomplete');
  for (const diagnostic of input.diagnostics) {
    if (!diagnostic.passed || diagnostic.category !== 'passed') failures.add(`quality:${diagnostic.stage}`);
  }
  return Object.freeze({ promote: failures.size === 0, failures: Object.freeze([...failures].sort()) });
}

export const STAGE7_DURABLE_RECOVERY_FAMILIES = Object.freeze([
  'activation', 'cleanup', 'transitionReceipt', 'lease', 'invalidation', 'queue', 'webhookOutcome',
] as const);

export function validateRollback(evidence: RollbackEvidence): PromotionDecision {
  const failures = new Set<string>();
  if (!evidence.targetSchemaCompatible) failures.add('schema_incompatible');
  if (!evidence.singleVercelProject || evidence.createsAdditionalTopology) failures.add('shared_topology_violation');
  if (!evidence.cloudflareAuthorityPreserved) failures.add('cloudflare_authority_violation');
  for (const family of STAGE7_DURABLE_RECOVERY_FAMILIES) {
    if (!evidence.durableRecovery[family]) failures.add(`durable_recovery:${family}`);
  }
  return Object.freeze({ promote: failures.size === 0, failures: Object.freeze([...failures].sort()) });
}
