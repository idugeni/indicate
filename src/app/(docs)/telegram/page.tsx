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
      <DocTitle title="Bot Telegram" description="Perintah redaksi via chat: pilih organisasi, susun artikel, terbitkan ke semua situs sekali ketuk — tanpa mengetik ID." />
      <DocH2>Prasyarat</DocH2>
      <DocP>
        Pemilik organisasi memetakan identitas Telegram (user + chat) ke pengguna lokal beserta peran dan cakupan
        region — perintah apa pun dari identitas tak terpetakan dijawab penolakan generik. Akun yang tertaut ke
        beberapa organisasi memilih dulu organisasi aktif lewat <InlineCode>/org</InlineCode>; pilihan diingat
        sampai kedaluwarsa 1 jam. Percakapan multi-langkah kedaluwarsa 1 jam; <InlineCode>/cancel</InlineCode> membatalkannya kapan saja.
      </DocP>
      <DocH2>Perintah</DocH2>
      <DocTable
        head={['Perintah', 'Kegunaan']}
        rows={[
          [<span key="c" className="font-mono text-[13px]">/start</span>, 'Menu utama + tombol aksi bot.'],
          [<span key="c" className="font-mono text-[13px]">/org</span>, 'Ganti organisasi aktif (pemilih tombol).'],
          [<span key="c" className="font-mono text-[13px]">/bantuan</span>, 'Panduan lengkap perintah bot.'],
          [<span key="c" className="font-mono text-[13px]">/article</span>, 'Buat artikel bertahap: region (tombol) → judul → body → sumber → slug; selesai tersaji tombol Terbitkan ke Semua Situs.'],
          [<span key="c" className="font-mono text-[13px]">/edit</span>, 'Pemilih artikel, lalu ubah judul/isi/sumber dengan pratinjau + tombol Simpan.'],
          [<span key="c" className="font-mono text-[13px]">/artikel</span>, 'Delapan artikel terbaru + tombol aksi per artikel.'],
          [<span key="c" className="font-mono text-[13px]">/cari KATA_KUNCI</span>, 'Cari artikel berdasar judul + tombol aksi hasil.'],
          [<span key="c" className="font-mono text-[13px]">/job</span>, 'Pekerjaan publikasi terbaru + tombol aksi per job.'],
          [<span key="c" className="font-mono text-[13px]">/portal</span>, 'Situs aktif + tombol detail per situs.'],
          [<span key="c" className="font-mono text-[13px]">/image</span>, 'Pemilih artikel, lalu mode unggah foto (satu per pesan, boleh banyak).'],
          [<span key="c" className="font-mono text-[13px]">/regions</span>, 'Daftar region aktif.'],
          [<span key="c" className="font-mono text-[13px]">/sites</span>, 'Pemilih artikel, lalu centang situs tujuan lewat tombol.'],
          [<span key="c" className="font-mono text-[13px]">/publish</span>, 'Pemilih artikel, lalu terbitkan ke situs tercentang atau sekaligus ke semua situs.'],
          [<span key="c" className="font-mono text-[13px]">/suggest</span>, 'Pemilih artikel, lalu saran judul/deskripsi unik per situs tanpa membuat job.'],
          [<span key="c" className="font-mono text-[13px]">/status</span>, 'Pemilih job + ringkasan sukses.'],
          [<span key="c" className="font-mono text-[13px]">/links</span>, 'Pemilih job + URL tayang hasil publikasi.'],
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
        Aturan validasi yang sama dengan dashboard/API berlaku di sini: judul/deskripsi antar situs harus unik —
        gunakan saran varian bila publish multi-situs ditolak karena duplikat.
      </DocCallout>
      <DocsPager slug="telegram" />
    </div>
  );
}
