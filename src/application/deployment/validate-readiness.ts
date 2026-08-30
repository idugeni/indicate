import type { DeploymentReadinessPort } from '@/ports/deployment-readiness';
import type { Result } from '@/shared/types/result';

export interface ExpectedSharedResourceIdentity {
  readonly supabaseProjectRef: string;
  readonly r2BucketName: string;
  readonly upstashResourceId: string;
  readonly vercelProjectId: string;
}

export type ReadinessFailureCategory =
  | 'SERVICE_UNHEALTHY'
  | 'SUPABASE_IDENTITY_MISMATCH'
  | 'R2_IDENTITY_MISMATCH'
  | 'UPSTASH_IDENTITY_MISMATCH'
  | 'VERCEL_IDENTITY_MISMATCH';

export async function validateDeploymentReadiness(
  port: DeploymentReadinessPort,
  expected: ExpectedSharedResourceIdentity,
): Promise<Result<'ready', readonly ReadinessFailureCategory[]>> {
  const snapshot = await port.inspect();
  const failures = new Set<ReadinessFailureCategory>();
  if (Object.values(snapshot.services).some((status) => status !== 'healthy')) failures.add('SERVICE_UNHEALTHY');
  if (
    snapshot.identities.supabaseAuthProjectRef !== expected.supabaseProjectRef
    || snapshot.identities.supabaseDatabaseProjectRef !== expected.supabaseProjectRef
  ) failures.add('SUPABASE_IDENTITY_MISMATCH');
  if (snapshot.identities.r2BucketName !== expected.r2BucketName) failures.add('R2_IDENTITY_MISMATCH');
  if (snapshot.identities.upstashResourceId !== expected.upstashResourceId) failures.add('UPSTASH_IDENTITY_MISMATCH');
  if (snapshot.identities.vercelProjectId !== expected.vercelProjectId) failures.add('VERCEL_IDENTITY_MISMATCH');

  return failures.size === 0
    ? { ok: true, value: 'ready' }
    : { ok: false, error: Object.freeze([...failures].sort()) };
}
