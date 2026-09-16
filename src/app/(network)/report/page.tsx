import type { Metadata } from 'next';
import { ReportPage } from '@/modules/site/components/network/network-listing';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';

type Props = {
  readonly searchParams: Promise<{ artikel?: string } & { [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/report', {});
}

function normalizeSlug(value: string | string[] | undefined): string | null {
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
