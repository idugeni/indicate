import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SearchPage } from '@/modules/site/components/network/network-listing';
import { deliveryComposition } from '@/modules/delivery';
import { checkSearchRateLimit } from '@/modules/delivery/search-rate-limit';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { nonIndexableRobots } from '@/modules/site/seo';

export const maxDuration = 60;

type Props = {
  readonly searchParams: Promise<{ q?: string } & { [key: string]: string | string[] | undefined }>;
};

/**
 * Normalize a raw search query to at most 120 chars.
 *
 * @param value - Raw query param (string or repeated).
 * @returns Trimmed-to-length query, empty when absent.
 */
export function normalizeQuery(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return (value[0] ?? '').slice(0, 120);
  return (value ?? '').slice(0, 120);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolved = await searchParams;
  const retryAfterSeconds = await throttledSearch();
  if (retryAfterSeconds !== null) {
    return { title: { absolute: 'Pencarian dibatasi' }, robots: nonIndexableRobots() };
  }
  return networkMetadata('/search', { search: normalizeQuery(resolved.q) });
}

/** Pencarian tenant: hasil dari korpus situs aktif. */
export default async function SearchPageRoute({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const retryAfterSeconds = await throttledSearch();
  if (retryAfterSeconds !== null) return <SearchThrottled query={query} retryAfterSeconds={retryAfterSeconds} />;
  const site = await resolveNetworkSite({ search: query }, '/search');
  return <SearchPage site={site} query={query} />;
}

async function throttledSearch(): Promise<string | null> {
  const requestId = crypto.randomUUID();
  const composition = await deliveryComposition();
  const incoming = await headers();
  const result = await composition.resolver.classify(
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
