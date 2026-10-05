import 'server-only';

import { Redis } from '@upstash/redis';

import { recordOperation } from '@/core/observability/operation-metrics';
import type { QueueClaim, RedisCoordinationPort } from '@/integrations/redis/ports';

const CLAIM_SCRIPT = `
local due = KEYS[1]
local leased = KEYS[2]
local now = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local leaseUntil = tonumber(ARGV[3])
local tokenPrefix = ARGV[4]
local expired = redis.call('ZRANGEBYSCORE', leased, '-inf', now, 'LIMIT', 0, limit)
for _, token in ipairs(expired) do
  if redis.call('ZREM', leased, token) == 1 then
    local separator = string.find(token, ':')
    if separator then redis.call('ZADD', due, now, string.sub(token, separator + 1)) end
  end
end
local ids = redis.call('ZRANGEBYSCORE', due, '-inf', now, 'LIMIT', 0, limit)
local result = {}
for _, id in ipairs(ids) do
  if redis.call('ZREM', due, id) == 1 then
    local token = tokenPrefix .. ':' .. id
    redis.call('ZADD', leased, leaseUntil, token)
    table.insert(result, id)
    table.insert(result, token)
  end
end
return result
`;

export interface UpstashPublicationQueueConfig {
  readonly url: string;
  readonly token: string;
  readonly namespace: string;
  readonly resourceId: string;
}

/** Record one queue Redis call; never throws. No keys or payloads leave this module. */
function recordQueueCall(operation: 'queue.depth' | 'queue.claim' | 'queue.enqueue' | 'queue.ack' | 'queue.mirror', started: number, commands: number, status: number): void {
  const durationMs = Date.now() - started;
  recordOperation({ route: 'queue', operation, provider: 'upstash-redis', durationMs, redisCommands: commands, redisMs: durationMs, status });
}

export class UpstashPublicationQueueAdapter implements RedisCoordinationPort {
  readonly resourceCount = 1 as const;
  readonly namespace: string;
  private readonly redis: Redis;
  private readonly dueKey: string;
  private readonly leasedKey: string;

  constructor(private readonly config: UpstashPublicationQueueConfig) {
    this.namespace = config.namespace;
    this.redis = new Redis({ url: config.url, token: config.token });
    this.dueKey = `${config.namespace}:queue:publication:due`;
    this.leasedKey = `${config.namespace}:queue:publication:leased`;
  }

  async check() {
    try {
      const pong = await this.redis.ping();
      return { service: 'upstash-redis', status: pong === 'PONG' ? 'healthy' as const : 'unhealthy' as const, category: pong === 'PONG' ? 'upstash_ready' : 'upstash_unavailable' };
    } catch {
      return { service: 'upstash-redis', status: 'unhealthy' as const, category: 'upstash_unavailable' };
    }
  }

  async schedule(logicalId: string, dueAt: Date): Promise<void> {
    if (logicalId.length > 200) throw new Error('Logical queue identifier exceeds limit.');
    const started = Date.now();
    try {
      await this.redis.zadd(this.dueKey, { score: dueAt.getTime(), member: logicalId });
      recordQueueCall('queue.enqueue', started, 1, 200);
    } catch (error) {
      recordQueueCall('queue.enqueue', started, 1, 500);
      throw error;
    }
  }

  async hasPendingWork(): Promise<boolean> {
    const started = Date.now();
    try {
      const [due, leased] = await Promise.all([this.redis.zcard(this.dueKey), this.redis.zcard(this.leasedKey)]);
      recordQueueCall('queue.depth', started, 2, 200);
      return due > 0 || leased > 0;
    } catch (error) {
      recordQueueCall('queue.depth', started, 2, 500);
      throw error;
    }
  }

  /**
   * Read due/leased set sizes without claiming.
   *
   * @returns Cardinality of both sets for backlog-aware start signals.
   * @remarks Same two ZCARDs as `hasPendingWork`; callers must not call both
   * on one tick — prefer this when the counts themselves are needed.
   */
  async peekDepth(): Promise<{ readonly due: number; readonly leased: number }> {
    const started = Date.now();
    try {
      const [due, leased] = await Promise.all([this.redis.zcard(this.dueKey), this.redis.zcard(this.leasedKey)]);
      recordQueueCall('queue.depth', started, 2, 200);
      return { due, leased };
    } catch (error) {
      recordQueueCall('queue.depth', started, 2, 500);
      throw error;
    }
  }

  async claimDue(now: Date, limit: number, leaseSeconds: number): Promise<readonly QueueClaim[]> {
    const boundedLimit = Math.max(1, Math.min(100, limit));
    const leaseExpiresAt = new Date(now.getTime() + Math.max(1, Math.min(300, leaseSeconds)) * 1_000);
    const prefix = crypto.randomUUID();
    const started = Date.now();
    try {
      const values = await this.redis.eval(CLAIM_SCRIPT, [this.dueKey, this.leasedKey], [now.getTime(), boundedLimit, leaseExpiresAt.getTime(), prefix]) as string[];
      const claims: QueueClaim[] = [];
      for (let index = 0; index < values.length; index += 2) {
        const logicalId = values[index]; const claimToken = values[index + 1];
        if (logicalId !== undefined && claimToken !== undefined) claims.push(Object.freeze({ logicalId, claimToken, leaseExpiresAt }));
      }
      recordQueueCall('queue.claim', started, 1, 200);
      return Object.freeze(claims);
    } catch (error) {
      recordQueueCall('queue.claim', started, 1, 500);
      throw error;
    }
  }

  async acknowledge(claim: QueueClaim): Promise<void> {
    const started = Date.now();
    try {
      await this.redis.zrem(this.leasedKey, claim.claimToken);
      recordQueueCall('queue.ack', started, 1, 200);
    } catch (error) {
      recordQueueCall('queue.ack', started, 1, 500);
      throw error;
    }
  }

  async mirrorState(organizationId: string, logicalId: string, state: string, ttlSeconds: number): Promise<void> {
    const started = Date.now();
    try {
      const key = `${this.namespace}:job:${organizationId}:${logicalId}`;
      await this.redis.set(key, state, { ex: Math.max(60, Math.min(86_400, ttlSeconds)) });
      recordQueueCall('queue.mirror', started, 1, 200);
    } catch (error) {
      recordQueueCall('queue.mirror', started, 1, 500);
      throw error;
    }
  }
}
