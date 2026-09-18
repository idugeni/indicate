import type { Metadata } from 'next';
import { SearchPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

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
  return networkMetadata('/search', { search: normalizeQuery(resolved.q) });
}

/** Pencarian tenant: hasil dari korpus situs aktif. */
export default async function SearchPageRoute({ searchParams }: Props) {
  const resolved = await searchParams;
  const query = normalizeQuery(resolved.q);
  const site = await resolveNetworkSite({ search: query }, '/search');
  return <SearchPage site={site} query={query} />;
}
