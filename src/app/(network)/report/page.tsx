import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ReportForm } from '@/app/(network)/report/report-form';
import { Section } from '@/modules/site/components/layout/content';
import { Skeleton } from '@/components/ui/skeleton';
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

async function ReportContent({ searchParams }: Props) {
  const resolved = await searchParams;
  const slug = normalizeSlug(resolved.artikel);
  await resolveNetworkSite(slug === null ? {} : { articleSlug: slug }, '/report');
  return (
    <Section
      title="Laporkan konten"
      eyebrow="Kepercayaan & keamanan"
      description="Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya."
    >
      <ReportForm articleSlug={slug} />
    </Section>
  );
}

export default function ReportPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ReportContent searchParams={searchParams} />
    </Suspense>
  );
}
