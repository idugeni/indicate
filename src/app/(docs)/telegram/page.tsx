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
      <DocTitle title="Bot Telegram" description="Perintah redaksi via chat: artikel, foto, publikasi, saran varian, cari, status, retry, dan unpublish." />
      <DocH2>Prasyarat</DocH2>
      <DocP>
        Pemilik organisasi memetakan identitas Telegram (user + chat) ke pengguna lokal beserta peran dan cakupan
        region — perintah apa pun dari identitas tak terpetakan dijawab penolakan generik. Percakapan multi-langkah
        kedaluwarsa 1 jam; <InlineCode>/cancel</InlineCode> membatalkannya kapan saja.
      </DocP>
      <DocH2>Perintah</DocH2>
      <DocTable
        head={['Perintah', 'Kegunaan']}
        rows={[
          [<span key="c" className="font-mono text-[13px]">/article</span>, 'Buat artikel bertahap: region → judul → body → sumber → slug.'],
          [<span key="c" className="font-mono text-[13px]">/artikel</span>, 'Delapan artikel terbaru + tombol aksi per artikel.'],
          [<span key="c" className="font-mono text-[13px]">/cari KATA_KUNCI</span>, 'Cari artikel berdasar judul + tombol aksi hasil.'],
          [<span key="c" className="font-mono text-[13px]">/portal</span>, 'Portal aktif + tombol detail per portal.'],
          [<span key="c" className="font-mono text-[13px]">/image ARTICLE_ID</span>, 'Mode unggah foto (satu per pesan, boleh banyak); tiap foto otomatis tersambung [gambar:N] di akhir body.'],
          [<span key="c" className="font-mono text-[13px]">/regions</span>, 'Daftar region aktif beserta ID-nya.'],
          [<span key="c" className="font-mono text-[13px]">/sites ARTICLE_ID</span>, 'Daftar portal aktif + ID untuk dipilih sebagai target.'],
          [<span key="c" className="font-mono text-[13px]">/publish ARTICLE_ID SITE_IDS KEY</span>, 'Minta publikasi; SITE_IDS dipisah koma; KEY kunci idempoten.'],
          [<span key="c" className="font-mono text-[13px]">/suggest ARTICLE_ID SITE_IDS</span>, 'Saran judul/deskripsi unik per portal tanpa membuat job.'],
          [<span key="c" className="font-mono text-[13px]">/status JOB_ID</span>, 'Status job + ringkasan sukses.'],
          [<span key="c" className="font-mono text-[13px]">/links JOB_ID</span>, 'URL tayang hasil publikasi.'],
          [<span key="c" className="font-mono text-[13px]">/retry JOB_ID [TARGETS]</span>, 'Antrekan ulang target gagal.'],
          [<span key="c" className="font-mono text-[13px]">/unpublish JOB_ID [TARGETS]</span>, 'Tarik publikasi target.'],
          [<span key="c" className="font-mono text-[13px]">/cancel</span>, 'Batalkan percakapan berjalan.'],
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
        Aturan validasi yang sama dengan dashboard/API berlaku di sini: judul/deskripsi antar portal harus unik —
        gunakan saran varian bila publish multi-portal ditolak karena duplikat.
      </DocCallout>
      <DocsPager slug="telegram" />
    </div>
  );
}
