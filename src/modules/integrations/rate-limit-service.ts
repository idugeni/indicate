import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { RateLimitDecision, RateLimitPolicy } from '@/modules/integrations/models';
import type { RateLimitPort } from '@/modules/integrations/ports';
import { createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import { rateLimitPolicySchema } from '@/modules/integrations/schemas';

const identityPart = (value: string) => value.replace(/[^A-Za-z0-9:_-]/g, '_').slice(0, 200);
export class RateLimitService {
  constructor(private readonly port: RateLimitPort, private readonly clock: { now(): Date } = { now: () => new Date() }) {}

  authenticatedKey(endpointClass: string, actor: AuthorizedTenantActorContext): string {
    return `${identityPart(endpointClass)}:org:${actor.organizationId}:actor:${actor.actorType}:${identityPart(actor.actorId)}`;
  }
  publicKey(endpointClass: string, validatedSource: string): string {
    return `${identityPart(endpointClass)}:public:${identityPart(validatedSource)}`;
  }
  async enforce(key: string, rawPolicy: unknown, requestId: string): Promise<Result<RateLimitDecision, PublicErrorEnvelope>> {
    const parsed = rateLimitPolicySchema.safeParse(rawPolicy);
    if (!parsed.success) return { ok: false, error: createPublicError('CONFIGURATION_INVALID', 'Rate-limit policy is unavailable.', requestId) };
    const policy: RateLimitPolicy = parsed.data;
    try {
      const decision = await this.port.consume(key, policy, this.clock.now());
      return decision.allowed ? { ok: true, value: decision } : { ok: false, error: createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', requestId, { retryAfterSeconds: [String(decision.retryAfterSeconds)] }) };
    } catch {
      if (policy.failureMode === 'open_low_risk') {
        const now = this.clock.now();
        return { ok: true, value: { allowed: true, remaining: 0, retryAfterSeconds: policy.windowSeconds, resetAt: new Date(now.getTime() + policy.windowSeconds * 1_000).toISOString() } };
      }
      return { ok: false, error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Request protection is temporarily unavailable.', requestId) };
    }
  }
}
