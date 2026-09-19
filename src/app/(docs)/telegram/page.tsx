import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { DocCallout, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'telegram');
}

export default function TelegramPage() {
  return (
    <div>
      <DocTitle title="Bot Telegram" description="Pintu masuk Mini App redaksi via chat: /start untuk tautan, /stop untuk berhenti. Seluruh aksi redaksi berjalan di Mini App." />
      <DocH2>Prasyarat</DocH2>
      <DocP>
        Perintah chat dipensiunkan kecuali <InlineCode>/start</InlineCode> dan <InlineCode>/stop</InlineCode>;
        susun artikel, unggah foto, atur situs, dan terbitkan semuanya lewat Mini App. Akun yang tertaut ke
        organisasi tetap dikenali untuk membersihkan sesi saat <InlineCode>/stop</InlineCode>; akun tanpa
        tautan tetap menerima tautan Mini App.
      </DocP>
      <DocH2>Perintah</DocH2>
      <DocTable
        head={['Perintah', 'Kegunaan']}
        rows={[
          [<span key="c" className="font-mono text-[13px]">/start</span>, 'Balasan foto + tautan buka Mini App redaksi.'],
          [<span key="c" className="font-mono text-[13px]">/stop</span>, 'Bersihkan sesi chat ini dan hentikan tautan bot; kirim /start untuk mulai lagi.'],
        ]}
      />
      <DocH2>Keamanan & keandalan</DocH2>
      <DocP>
        Setiap update Telegram diverifikasi token rahasianya (perbandingan constant-time), freshness waktunya, lalu
        didedup per <InlineCode>update_id</InlineCode> dengan lease klaim — pengiriman ganda Bot API tak pernah
        mengeksekusi bisnis dua kali. Balasan chat dikirim setelah respons webhook ( pola <InlineCode>after()</InlineCode>)
        dan yang gagal masuk outbox dengan backoff menghormati <InlineCode>retry_after</InlineCode> Telegram.
      </DocP>
      <DocCallout tone="info">
        Aturan validasi yang sama dengan dashboard/API berlaku di Mini App: judul/deskripsi antar situs harus unik.
      </DocCallout>
      <DocsPager slug="telegram" />
    </div>
  );
}
