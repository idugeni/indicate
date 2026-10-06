import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { Container } from '@/modules/site/components/network/ui/container';
import { BlackLimeReportForm } from '@/modules/site/components/network/templates/black-lime/pages/report-form';

export interface BlackLimeReportProps {
  readonly site: NetworkSiteData;
  readonly articleSlug: string | null;
  readonly challengeSitekey: string | null;
}

/**
 * Formulir laporan pelanggaran tenant; artikel terkait opsional via query.
 */
export function BlackLimeReport({ site, articleSlug, challengeSitekey }: BlackLimeReportProps) {
  return (
    <BlackLimeShell site={site} path="/report">
      <Container className="max-w-3xl py-8 md:py-12">
        <p className="m-0 font-sans text-xs font-medium uppercase tracking-wider text-[var(--tpl-muted,#a3ad9a)]">
          Kepercayaan & keamanan
        </p>
        <h1 className="m-0 mt-2 font-sans text-3xl font-extrabold tracking-tight text-[var(--tpl-ink,#f2f5e9)]">
          Laporkan konten
        </h1>
        <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-[var(--tpl-muted,#a3ad9a)]">
          Laporan pelanggaran ditinjau redaksi paling lambat 1x24 jam. Konten yang terbukti melanggar hukum ditarik dan dicatat penanganannya.
        </p>
        <div className="mt-6 rounded-2xl bg-[var(--tpl-card,#131711)] p-5 shadow-sm ring-1 ring-[var(--tpl-ring,#242b1f)]/60 sm:p-7">
          <BlackLimeReportForm articleSlug={articleSlug} challengeSitekey={challengeSitekey} />
        </div>
      </Container>
    </BlackLimeShell>
  );
}
