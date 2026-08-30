import type {
  ActorContext,
  AuthorizedTenantActorContext,
  HostnameContext,
  OperationContext,
} from '@/domain/context/operation-context';
import type { Result } from '@/shared/types/result';

export type ContextFailure = 'MISSING_CONTEXT' | 'CONFLICTING_CONTEXT' | 'UNAUTHORIZED_CONTEXT';

export interface ContextCandidate {
  readonly actor?: ActorContext;
  readonly hostname?: HostnameContext;
}

export function resolveOperationContext(candidate: ContextCandidate): Result<OperationContext, ContextFailure> {
  const hasActor = candidate.actor !== undefined;
  const hasHostname = candidate.hostname !== undefined;
  if (hasActor === hasHostname) {
    return { ok: false, error: hasActor ? 'CONFLICTING_CONTEXT' : 'MISSING_CONTEXT' };
  }
  if (candidate.actor !== undefined) {
    if (candidate.actor.organizationId === null) {
      return { ok: false, error: 'UNAUTHORIZED_CONTEXT' };
    }
    return { ok: true, value: { kind: 'tenant', actor: candidate.actor as AuthorizedTenantActorContext } };
  }
  if (candidate.hostname !== undefined) {
    return { ok: true, value: { kind: 'public', hostname: candidate.hostname } };
  }
  return { ok: false, error: 'MISSING_CONTEXT' };
}

export async function withVerifiedOperationContext<T>(
  candidate: ContextCandidate,
  operation: (context: OperationContext) => Promise<T>,
): Promise<Result<T, ContextFailure>> {
  const context = resolveOperationContext(candidate);
  if (!context.ok) {
    return context;
  }
  return { ok: true, value: await operation(context.value) };
}
