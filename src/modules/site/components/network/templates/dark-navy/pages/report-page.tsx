import type { NetworkSiteData } from '@/modules/delivery/models';
import { DarkNavyShell } from '@/modules/site/components/network/templates/dark-navy/chrome/shell';
import { DarkNavyContainer } from '@/modules/site/components/network/templates/dark-navy/ui/container';
import { DarkNavyReportForm } from '@/modules/site/components/network/templates/dark-navy/pages/report-form';

export interface DarkNavyReportProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Formulir laporan pelanggaran tenant; artikel terkait opsional via query.
 */
export function DarkNavyReport({ site, articleSlug }: DarkNavyReportProps) {
  return (
    <DarkNavyShell site={site} path="/report">
      <DarkNavyContainer className="max-w-3xl py-8 md:py-12">
        <p className="m-0 font-sans text-xs font-medium uppercase tracking-wider text-[#9aa9c4]">
          Kepercayaan & keamanan
        </p>
        <h1 className="m-0 mt-2 font-sans text-3xl font-extrabold tracking-tight text-[#eaf0fb]">
          Laporkan konten
        </h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#9aa9c4]">
          Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya.
        </p>
        <div className="mt-6 rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f]/60 sm:p-7">
          <DarkNavyReportForm articleSlug={articleSlug} />
        </div>
      </DarkNavyContainer>
    </DarkNavyShell>
  );
}
