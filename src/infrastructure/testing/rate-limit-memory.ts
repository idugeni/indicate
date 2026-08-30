import type { RateLimitDecision, RateLimitPolicy } from '@/domain/stage6/models';
import type { RateLimitPort } from '@/ports/rate-limit';

export class InMemoryRateLimitAdapter implements RateLimitPort {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  failNext = false;
  async consume(key: string, policy: RateLimitPolicy, now: Date): Promise<RateLimitDecision> {
    if (this.failNext) { this.failNext = false; throw new Error('Injected rate-limit outage'); }
    const prior = this.windows.get(key); const windowMs = policy.windowSeconds * 1_000;
    const current = prior === undefined || now.getTime() >= prior.startedAt + windowMs ? { startedAt: now.getTime(), count: 1 } : { ...prior, count: prior.count + 1 };
    this.windows.set(key, current); const resetAt = new Date(current.startedAt + windowMs); const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000));
    return { allowed: current.count <= policy.allowance, remaining: Math.max(0, policy.allowance - current.count), retryAfterSeconds, resetAt: resetAt.toISOString() };
  }
}
