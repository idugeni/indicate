import 'server-only';

import type { ResolvedSiteContext } from '@/modules/delivery/models';
import {
  HOST_CACHE_HIT_TTL_SECONDS,
  HOST_CACHE_MISS_TTL_SECONDS,
  hostnameCacheKey,
  parseHostnameCacheEntry,
  type HostnameCachePort,
} from '@/integrations/redis/hostname-read-model';
import type { UpstashSnapshotStore } from '@/integrations/redis/upstash-snapshot-store';

/**
 * Shared hostname read-model over the snapshot store.
 *
 * @remarks Fail-open projection of durable Postgres intent: every failure
 * returns undefined so callers fall back to the database, and writes are
 * best-effort. Hits live up to an hour; misses (unknown hosts) live a
 * minute so typo floods stay cheap without pinning 404s.
 */
export class UpstashHostnameCache implements HostnameCachePort {
  constructor(private readonly store: Pick<UpstashSnapshotStore, 'readKey' | 'writeKey' | 'deleteKey'>) {}

  async readHost(hostname: string): Promise<readonly ResolvedSiteContext[] | undefined> {
    const raw = await this.store.readKey(hostnameCacheKey(hostname));
    if (raw === null) return undefined;
    return parseHostnameCacheEntry(raw);
  }

  async writeHost(hostname: string, matches: readonly ResolvedSiteContext[]): Promise<void> {
    const ttl = matches.length === 0 ? HOST_CACHE_MISS_TTL_SECONDS : HOST_CACHE_HIT_TTL_SECONDS;
    await this.store.writeKey(hostnameCacheKey(hostname), [...matches], ttl);
  }

  async deleteHost(hostname: string): Promise<void> {
    await this.store.deleteKey(hostnameCacheKey(hostname));
  }
}
