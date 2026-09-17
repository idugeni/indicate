import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { apiActionScopeTable } from '@/modules/docs/openapi';
import { DocCallout, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'authentication');
}

export default function AuthenticationPage() {
  return (
    <div>
      <DocTitle title="Autentikasi & scope" description="API key Bearer, scope per aksi, rotasi, dan respons penolakan yang tidak membocorkan informasi." />
      <DocH2>Skema</DocH2>
      <DocP>
        Setiap request membawa <InlineCode>Authorization: Bearer &lt;api-key&gt;</InlineCode>. Key diverifikasi
        (lookup + hash garam), scope dicocokkan per aksi, dan langganan organisasi harus aktif. Key tanpa scope yang
        tepat, key kedaluwarsa/dicabut, atau langganan nonaktif semuanya dijawab tanpa membocorkan alasan rinci.
      </DocP>
      <DocH2>Scope per aksi</DocH2>
      <DocTable
        head={['Aksi', 'Scope', 'Keterangan']}
        rows={apiActionScopeTable().map(({ action, scope, summary }) => [
          <span key="a" className="font-mono text-[13px]">{action}</span>,
          <span key="s" className="font-mono text-[13px]">{scope}</span>,
          summary,
        ])}
      />
      <DocH2>Penolakan non-disclosing</DocH2>
      <DocP>
        Kredensial salah, format Bearer hilang, atau origin tak tepercaya dijawab <InlineCode>404</InlineCode> dengan
        envelope generik — penyerang tak bisa membedakan "key salah" dari "endpoint tak ada". Kegagalan validasi
        payload memakai <InlineCode>400</InlineCode> beserta rincian field.
      </DocP>
      <DocH2>Rotasi & masa berlaku</DocH2>
      <DocP>
        Rotasi dilakukan dari dashboard (key lama masuk masa tenggang pendahulu, lalu dicabut). Key dapat diberi
        kedaluwarsa dan cakupan region. Praktik yang disarankan: satu key per integrator, rotasi berkala, simpan di
        secret manager — jangan di repo, log, atau bundle klien.
      </DocP>
      <DocCallout tone="info">
        Seluruh trafik API wajib melewati edge Cloudflare dengan secret origin; pemanggilan langsung ke origin tanpa
        header injeksi edge ditolak di gerbang.
      </DocCallout>
      <DocsPager slug="authentication" />
    </div>
  );
}
