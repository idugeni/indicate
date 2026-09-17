import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { DocCallout, DocCode, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'webhooks');
}

export default function WebhooksPage() {
  return (
    <div>
      <DocTitle title="Webhook generik" description="Kontrak HMAC, freshness timestamp, replay-id idempoten, dan kode respons endpoint inbound." />
      <DocH2>Endpoint</DocH2>
      <DocCode language="http" code="POST https://webhook.indicate.web.id/api/webhooks/generic" />
      <DocH2>Header kontrak</DocH2>
      <DocTable
        head={['Header', 'Wajib', 'Keterangan']}
        rows={[
          [<span key="h" className="font-mono text-[13px]">x-indicate-webhook-source</span>, 'Ya', 'Identitas sumber pengirim.'],
          [<span key="h" className="font-mono text-[13px]">x-indicate-replay-id</span>, 'Ya', 'ID unik per pengiriman; pengiriman ulang dengan ID sama direkonsiliasi, bukan diproses ganda.'],
          [<span key="h" className="font-mono text-[13px]">x-indicate-timestamp</span>, 'Ya', 'Stempel waktu pengirim; di luar jendela freshness kebijakan → ditolak.'],
          [<span key="h" className="font-mono text-[13px]">x-indicate-signature</span>, 'Ya', 'HMAC atas body memakai secret generik bersama.'],
        ]}
      />
      <DocH2>Semantik pemrosesan</DocH2>
      <DocP>
        Klaim replay diikat ke digest body: body berbeda dengan replay-id sama ditolak; hasil bisnis yang sudah
        durable direplay dari kuitansi (recovery), bukan dieksekusi ulang. Jendela freshness dan retensi replay
        diambil dari kebijakan webhook aktif — bukan angka yang di-hardcode di dokumen ini.
      </DocP>
      <DocH2>Respons</DocH2>
      <DocTable
        head={['Status', 'Arti']}
        rows={[
          ['200', 'Diproses; { data, requestId }.'],
          ['400', 'Payload/header tak valid.'],
          ['409', 'Duplikat yang sedang diproses.'],
          ['429', 'Rate limit webhook; hormati Retry-After.'],
          ['404', 'Penolakan non-disclosing (sumber/secret salah).'],
        ]}
      />
      <DocCallout tone="warn">
        Jangan kirim ulang dengan replay-id baru untuk mengulang pengiriman yang sama — itu menciptakan pemrosesan
        ganda. Kirim ulang selalu memakai replay-id yang sama.
      </DocCallout>
      <DocP>
        Endpoint Telegram (<InlineCode>/api/webhooks/telegram</InlineCode>) memakai kontrak berbeda (token rahasia Bot
        API + freshness update + dedup update_id) — lihat halaman <InlineCode>Bot Telegram</InlineCode>. Endpoint{' '}
        <InlineCode>/api/webhooks/readiness/telegram-secret</InlineCode> dipakai memeriksa kesiapan secret webhook.
      </DocP>
      <DocsPager slug="webhooks" />
    </div>
  );
}
