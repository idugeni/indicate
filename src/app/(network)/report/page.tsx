import type { Metadata } from 'next';
import { ReportPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly searchParams: Promise<{ artikel?: string } & { [key: string]: string | string[] | undefined }>;
};

/**
 * The report form is a utility surface, not content: it is `noindex, nofollow` so it
 * never competes with an article for the same query, and `serializeRobots` disallows
 * `/report` for the same reason it disallows `/search`.
 */
export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/report', {}, undefined, undefined, 'noindex, nofollow');
}

/**
 * Normalize a raw article slug to lowercase, at most 200 chars.
 *
 * @param value - Raw slug param (string or repeated).
 * @returns Normalized slug, or null when empty.
 */
export function normalizeSlug(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  const slug = raw.trim().toLowerCase().slice(0, 200);
  return slug === '' ? null : slug;
}

export default async function ReportPageRoute({ searchParams }: Props) {
  const resolved = await searchParams;
  const slug = normalizeSlug(resolved.artikel);
  const site = await resolveNetworkSite(slug === null ? {} : { articleSlug: slug }, '/report');
  return <ReportPage site={site} articleSlug={slug} />;
}
