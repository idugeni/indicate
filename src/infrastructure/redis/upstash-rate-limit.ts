import 'server-only';

import { Redis } from '@upstash/redis';
import type { RateLimitDecision, RateLimitPolicy } from '@/domain/stage6/models';
import type { RateLimitPort } from '@/ports/rate-limit';

const FIXED_WINDOW_SCRIPT = `
local key = KEYS[1]
local allowance = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = redis.call('INCR', key)
if current == 1 then redis.call('PEXPIRE', key, ttl) end
local remainingTtl = redis.call('PTTL', key)
if remainingTtl < 0 then remainingTtl = ttl end
return {current, remainingTtl, allowance}
`;

export class UpstashRateLimitAdapter implements RateLimitPort {
  private readonly redis: Redis;
  constructor(config: { readonly url: string; readonly token: string; readonly namespace: string }) {
    this.redis = new Redis({ url: config.url, token: config.token }); this.namespace = config.namespace;
  }
  private readonly namespace: string;
  async consume(key: string, policy: RateLimitPolicy, now: Date): Promise<RateLimitDecision> {
    const values = await this.redis.eval(FIXED_WINDOW_SCRIPT, [`${this.namespace}:ratelimit:${key}`], [policy.allowance, policy.windowSeconds * 1_000]) as number[];
    const count = Number(values[0] ?? policy.allowance + 1); const ttlMs = Math.max(1, Number(values[1] ?? policy.windowSeconds * 1_000));
    const retryAfterSeconds = Math.max(1, Math.ceil(ttlMs / 1_000));
    return Object.freeze({ allowed: count <= policy.allowance, remaining: Math.max(0, policy.allowance - count), retryAfterSeconds, resetAt: new Date(now.getTime() + ttlMs).toISOString() });
  }
}
