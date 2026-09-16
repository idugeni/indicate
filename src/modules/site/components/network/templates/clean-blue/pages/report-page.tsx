import type { NetworkSiteData } from '@/modules/delivery/models';
import { CleanBlueShell } from '@/modules/site/components/network/templates/clean-blue/chrome/shell';
import { CleanBlueContainer } from '@/modules/site/components/network/templates/clean-blue/ui/container';
import { CleanBlueReportForm } from '@/modules/site/components/network/templates/clean-blue/pages/report-form';

export interface CleanBlueReportProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Formulir laporan pelanggaran tenant; artikel terkait opsional via query.
 */
export function CleanBlueReport({ site, articleSlug }: CleanBlueReportProps) {
  return (
    <CleanBlueShell site={site} path="/report">
      <CleanBlueContainer className="max-w-3xl py-8 md:py-12">
        <p className="m-0 font-sans text-xs font-medium uppercase tracking-wider text-slate-600">
          Kepercayaan & keamanan
        </p>
        <h1 className="m-0 mt-2 font-sans text-3xl font-extrabold tracking-tight text-slate-900">
          Laporkan konten
        </h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
          Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya.
        </p>
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60 sm:p-7">
          <CleanBlueReportForm articleSlug={articleSlug} />
        </div>
      </CleanBlueContainer>
    </CleanBlueShell>
  );
}
