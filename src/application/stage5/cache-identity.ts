import { createHash } from 'node:crypto';
import type { CacheIdentity, ResolvedSiteContext } from '@/domain/stage5/models';

export interface CacheIdentityInput {
  readonly context: ResolvedSiteContext | null;
  readonly locale: string;
  readonly path: string;
  readonly query: URLSearchParams | Readonly<Record<string, string | readonly string[]>>;
  readonly preview: boolean;
  readonly authClass: 'anonymous' | 'authenticated';
}

function normalizePath(path: string): string {
  const clean = `/${path}`.replace(/\/{2,}/gu, '/');
  return clean.length > 1 && clean.endsWith('/') ? clean.slice(0, -1) : clean;
}

function normalizeQuery(query: CacheIdentityInput['query']): string {
  const pairs: [string, string][] = [];
  if (query instanceof URLSearchParams) query.forEach((value, key) => pairs.push([key, value]));
  else for (const [key, raw] of Object.entries(query)) for (const value of Array.isArray(raw) ? raw : [raw]) pairs.push([key, value]);
  return pairs.sort(([ak, av], [bk, bv]) => ak.localeCompare(bk) || av.localeCompare(bv)).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

export function createCacheIdentity(input: CacheIdentityInput): CacheIdentity | null {
  if (input.context === null || input.context.normalizedHostname === '') return null;
  const embedded = Object.freeze({ hostname: input.context.normalizedHostname, organizationId: input.context.organizationId, siteId: input.context.siteId, routingVersion: input.context.routingVersion, contentVersion: input.context.contentVersion });
  const canonical = JSON.stringify({ v: 1, hostname: embedded.hostname, organizationId: embedded.organizationId, siteId: embedded.siteId, regionId: input.context.regionId ?? '', locale: input.locale, path: normalizePath(input.path), query: normalizeQuery(input.query), preview: input.preview, authClass: input.authClass, routingVersion: embedded.routingVersion, contentVersion: embedded.contentVersion });
  return Object.freeze({ key: `public:v1:${createHash('sha256').update(canonical).digest('hex')}`, embedded });
}

export function cacheEntryMatches(identity: CacheIdentity, context: ResolvedSiteContext): boolean {
  const { embedded } = identity;
  return embedded.hostname === context.normalizedHostname && embedded.organizationId === context.organizationId && embedded.siteId === context.siteId && embedded.routingVersion === context.routingVersion && embedded.contentVersion === context.contentVersion;
}

export function redisCacheNamespace(environment: string, organizationId: string, siteId: string): string {
  return `indicate:${environment}:v1:cache:${organizationId}:${siteId}`;
}
