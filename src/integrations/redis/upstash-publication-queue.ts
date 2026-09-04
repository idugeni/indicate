import 'server-only';

import { Redis } from '@upstash/redis';

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
    await this.redis.zadd(this.dueKey, { score: dueAt.getTime(), member: logicalId });
  }

  async claimDue(now: Date, limit: number, leaseSeconds: number): Promise<readonly QueueClaim[]> {
    const boundedLimit = Math.max(1, Math.min(100, limit));
    const leaseExpiresAt = new Date(now.getTime() + Math.max(1, Math.min(300, leaseSeconds)) * 1_000);
    const prefix = crypto.randomUUID();
    const values = await this.redis.eval(CLAIM_SCRIPT, [this.dueKey, this.leasedKey], [now.getTime(), boundedLimit, leaseExpiresAt.getTime(), prefix]) as string[];
    const claims: QueueClaim[] = [];
    for (let index = 0; index < values.length; index += 2) {
      const logicalId = values[index]; const claimToken = values[index + 1];
      if (logicalId !== undefined && claimToken !== undefined) claims.push(Object.freeze({ logicalId, claimToken, leaseExpiresAt }));
    }
    return Object.freeze(claims);
  }

  async acknowledge(claim: QueueClaim): Promise<void> {
    await this.redis.zrem(this.leasedKey, claim.claimToken);
  }

  async mirrorState(organizationId: string, logicalId: string, state: string, ttlSeconds: number): Promise<void> {
    const key = `${this.namespace}:job:${organizationId}:${logicalId}`;
    await this.redis.set(key, state, { ex: Math.max(60, Math.min(86_400, ttlSeconds)) });
  }
}
