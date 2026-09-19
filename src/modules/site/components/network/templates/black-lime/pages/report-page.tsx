import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeContainer } from '@/modules/site/components/network/templates/black-lime/ui/container';
import { BlackLimeReportForm } from '@/modules/site/components/network/templates/black-lime/pages/report-form';

export interface BlackLimeReportProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
}

/**
 * Formulir laporan pelanggaran tenant; artikel terkait opsional via query.
 */
export function BlackLimeReport({ site, articleSlug }: BlackLimeReportProps) {
  return (
    <BlackLimeShell site={site} path="/report">
      <BlackLimeContainer className="max-w-3xl py-8 md:py-12">
        <p className="m-0 font-sans text-xs font-medium uppercase tracking-wider text-[#a3ad9a]">
          Kepercayaan & keamanan
        </p>
        <h1 className="m-0 mt-2 font-sans text-3xl font-extrabold tracking-tight text-[#f2f5e9]">
          Laporkan konten
        </h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[#a3ad9a]">
          Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya.
        </p>
        <div className="mt-6 rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60 sm:p-7">
          <BlackLimeReportForm articleSlug={articleSlug} />
        </div>
      </BlackLimeContainer>
    </BlackLimeShell>
  );
}
