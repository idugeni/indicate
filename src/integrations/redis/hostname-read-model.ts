import 'server-only';

import type { ResolvedSiteContext } from '@/modules/delivery/models';

export const HOST_CACHE_HIT_TTL_SECONDS = 3600;
export const HOST_CACHE_MISS_TTL_SECONDS = 60;

export interface HostnameCachePort {
  readHost(hostname: string): Promise<readonly ResolvedSiteContext[] | undefined>;
  writeHost(hostname: string, matches: readonly ResolvedSiteContext[]): Promise<void>;
  deleteHost(hostname: string): Promise<void>;
}

/**
 * Builds the shared hostname cache key.
 *
 * @param hostname - Normalized exact hostname.
 * @returns Namespaced key suffix for the snapshot store.
 */
export function hostnameCacheKey(hostname: string): string {
  return `host:${hostname}`;
}

/**
 * Validates a cached hostname entry without trusting its shape.
 *
 * @param value - Raw cached payload.
 * @returns Site contexts when the payload is a well-formed array, else undefined.
 */
export function parseHostnameCacheEntry(value: unknown): readonly ResolvedSiteContext[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const contexts: ResolvedSiteContext[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return undefined;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.normalizedHostname !== 'string' ||
      typeof record.organizationId !== 'string' ||
      typeof record.domainId !== 'string' ||
      typeof record.siteId !== 'string' ||
      (record.regionId !== null && typeof record.regionId !== 'string') ||
      typeof record.routingVersion !== 'number' ||
      typeof record.contentVersion !== 'number'
    ) {
      return undefined;
    }
    contexts.push({
      normalizedHostname: record.normalizedHostname,
      organizationId: record.organizationId,
      domainId: record.domainId,
      siteId: record.siteId,
      regionId: record.regionId,
      routingVersion: record.routingVersion,
      contentVersion: record.contentVersion,
    });
  }
  return contexts;
}
