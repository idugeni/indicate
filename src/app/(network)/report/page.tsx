import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ReportForm } from '@/app/(network)/report/report-form';
import { Section } from '@/modules/site/components/layout/content';
import { CleanBlueLoader } from '@/modules/site/components/network/templates/clean-blue/loader';
import { normalizeTemplateId } from '@/modules/site/components/network/templates/listing-shared';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/shell';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/shared';
import { CleanBlueReportForm } from '@/modules/site/components/network/templates/clean-blue/report-form';
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
  const site = await resolveNetworkSite(slug === null ? {} : { articleSlug: slug }, '/report');
  if (normalizeTemplateId(site.settings.colors.templateId) === 'clean-blue') {
    return (
      <CleanBlueShell site={site} path="/report">
        <CleanBlueContainer className="max-w-3xl py-8 md:py-12">
            <p className="m-0 font-sans text-xs font-medium uppercase tracking-wider text-slate-500">
              Kepercayaan & keamanan
            </p>
            <h1 className="m-0 mt-2 font-sans text-3xl font-extrabold tracking-tight text-slate-900">
              Laporkan konten
            </h1>
            <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
              Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya.
            </p>
            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-7">
              <CleanBlueReportForm articleSlug={slug} />
            </div>
        </CleanBlueContainer>
      </CleanBlueShell>
    );
  }
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
    <Suspense fallback={<CleanBlueLoader label="Memuat formulir" />}>
      <ReportContent searchParams={searchParams} />
    </Suspense>
  );
}
