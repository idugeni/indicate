import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { cache } from 'react';
import { SearchPage } from '@/modules/site/components/network/network-listing';
import { checkSearchRateLimit } from '@/modules/delivery/search-rate-limit';
import { classifyTenantHost, networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { nonIndexableRobots } from '@/modules/site/seo';
import { normalizeQuery } from './route-helpers';

export const maxDuration = 25;

type Props = {
  readonly searchParams: Promise<{ q?: string } & { [key: string]: string | string[] | undefined }>;
};


/**
 * Metadata for a search the limiter already refused.
 *
 * @returns Tenant-free noindex metadata; costs no site read.
 * @remarks The limiter exists to keep this path off the database, so the
 * throttled document must not spend one either. Search pages are noindex on
 * every path, so nothing indexable is lost — only the tenant brand suffix,
 * which a throttled visitor was not going to read anyway.
 */
function throttledMetadata(): Metadata {
  return {
    title: { absolute: 'Pencarian dibatasi sementara' },
    description: 'Terlalu banyak permintaan pencarian. Coba lagi sebentar lagi.',
    robots: nonIndexableRobots(),
  };
}

/**
 * Throttle decision for this request, shared by metadata and the page body.
 *
 * @returns Retry delay in seconds, or null when the request may proceed.
 * @remarks The limiter counts tokens, not requests. Metadata and the page body
 * are two entry points into the same document, and calling the limiter from
 * both without memoization bills every search twice against the per-host
 * allowance, halving real search capacity for no added protection.
 */
const searchThrottle = cache(throttledSearch);

async function throttledSearch(): Promise<string | null> {
  const incoming = await headers();
  // Must follow the dynamic read: `generateMetadata` runs during prerender, and
  // Next.js rejects `crypto.randomUUID()` reached before the route is dynamic.
  const requestId = crypto.randomUUID();
  const result = await classifyTenantHost(
    incoming.get('x-forwarded-host') ?? incoming.get('host'),
  );
  if (result.kind !== 'site') return null;
  const context = await getServerRuntimeContext();
  const production = await createProductionIntegrationsContext();
  const throttle = await checkSearchRateLimit(production.rateLimits, {
    hostname: result.context.normalizedHostname,
    policy: context.config.rateLimits.publicRead,
    requestId,
  });
  return throttle.allowed ? null : throttle.retryAfterSeconds;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  if (await searchThrottle() !== null) return throttledMetadata();
  const resolved = await searchParams;
  return networkMetadata('/search', { search: normalizeQuery(resolved.q) });
}

/** Tenant search: results from the active site corpus. */
export default async function SearchPageRoute({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const retryAfterSeconds = await searchThrottle();
  if (retryAfterSeconds !== null) return <SearchThrottled query={query} retryAfterSeconds={retryAfterSeconds} />;
  const site = await resolveNetworkSite({ search: query }, '/search');
  return <SearchPage site={site} query={query} />;
}

function SearchThrottled({ query, retryAfterSeconds }: { readonly query: string; readonly retryAfterSeconds: string }) {
  return (
    <main>
      <h1>Pencarian dibatasi sementara</h1>
      <p>
        Terlalu banyak permintaan pencarian{query === '' ? '' : ` untuk "${query}"`}. Coba lagi dalam{' '}
        {retryAfterSeconds} detik.
      </p>
      <form action="/search" method="get" role="search">
        <input type="search" name="q" defaultValue={query} maxLength={120} aria-label="Pencarian" />
        <button type="submit">Cari</button>
      </form>
    </main>
  );
}
