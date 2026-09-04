import 'server-only';
import { Redis } from '@upstash/redis';
import type { CacheCoordinationPort } from '@/modules/delivery/ports';

export class UpstashCacheCoordination implements CacheCoordinationPort {
  private readonly redis: Redis;
  constructor(url: string, token: string, private readonly namespace: string) { this.redis = new Redis({ url, token }); }
  private key(kind: string, organizationId: string, siteId: string) { return `${this.namespace}:${kind}:${organizationId}:${siteId}`; }
  async incrementSiteVersion(organizationId: string, siteId: string) { await this.redis.incr(this.key('cachever', organizationId, siteId)); }
  async setSiteBypass(organizationId: string, siteId: string, enabled: boolean) { const key = this.key('cachebypass', organizationId, siteId); if (enabled) await this.redis.set(key, '1', { ex: 86_400 }); else await this.redis.del(key); }
}
