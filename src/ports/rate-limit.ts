import type { RateLimitDecision, RateLimitPolicy } from '@/domain/stage6/models';

export interface RateLimitPort {
  consume(key: string, policy: RateLimitPolicy, now: Date): Promise<RateLimitDecision>;
}
