import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { apiActionScopeTable } from '@/modules/docs/openapi';
import { DocCode, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'openapi');
}

export default async function OpenApiPage() {
  const host = await docsRequestHost();
  return (
    <div>
      <DocTitle title="Spesifikasi OpenAPI" description="Kontrak mesin untuk sembilan aksi API — dihasilkan modul yang sama dengan halaman referensi." />
      <DocH2>Unduh</DocH2>
      <DocCode language="bash" code={`curl -s https://${host}/openapi.json -o indicate-openapi.json`} />
      <DocP>
        Dokumen OpenAPI 3.1 memakai server produksi, skema auth Bearer, dan contoh payload yang
        lolos validasi Zod server (dijaga contract test <InlineCode>openapi.test.ts</InlineCode>). Impor ke
        Postman/Insomnia/Scalar/Redoc apa adanya.
      </DocP>
      <DocH2>Cakupan</DocH2>
      <DocTable
        head={['Aksi', 'Scope']}
        rows={apiActionScopeTable().map(({ action, scope }) => [
          <span key="a" className="font-mono text-[13px]">{action}</span>,
          <span key="s" className="font-mono text-[13px]">{scope}</span>,
        ])}
      />
      <DocsPager slug="openapi" />
    </div>
  );
}
