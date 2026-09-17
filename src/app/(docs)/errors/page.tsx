import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { DocCallout, DocCode, DocH2, DocP, DocTable, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'errors');
}

export default function ErrorsPage() {
  return (
    <div>
      <DocTitle title="Error & rate limit" description="Envelope error publik, pemetaan status HTTP, retry-after, dan kelas rate limit." />
      <DocH2>Envelope</DocH2>
      <DocP>
        Semua kegagalan memakai satu bentuk: <InlineCode>{'{ "error": { "code": "...", "message": "...", "fields"?: {...} } }'}</InlineCode>.
        Pesan aman ditampilkan ke integrator; detail internal tak pernah bocor.
      </DocP>
      <DocH2>Kode → status (API v1)</DocH2>
      <DocTable
        head={['Kode', 'Status', 'Arti']}
        rows={[
          ['INVALID_INPUT', '400', 'Payload/header tak valid; fields merinci per field.'],
          ['RESOURCE_UNAVAILABLE', '404', 'Target tak ada/tertutup. Kredensial salah juga 404 (non-disclosing).'],
          ['CONFLICT / IDEMPOTENCY_CONFLICT / INVALID_STATE_TRANSITION', '409', 'Bentrok state; idempotencyKey terpakai request lain.'],
          ['RATE_LIMITED', '429', 'Kuota habis; fields.retryAfterSeconds + header Retry-After.'],
          ['DEPENDENCY_UNAVAILABLE', '503', 'Dependensi hilir bermasalah; aman di-retry.'],
        ]}
      />
      <DocH2>Kode → status (webhook)</DocH2>
      <DocTable
        head={['Kode', 'Status', 'Arti']}
        rows={[
          ['INVALID_INPUT', '400', 'Update/event tak valid.'],
          ['CONFLICT', '409', 'Duplikat sedang diproses.'],
          ['RATE_LIMITED', '429', 'Ikuti Retry-After.'],
          ['DEPENDENCY_UNAVAILABLE', '503', 'Retry aman dan idempoten.'],
        ]}
      />
      <DocH2>Kelas rate limit</DocH2>
      <DocTable
        head={['Kelas', 'Cakupan', 'Mode gagal']}
        rows={[
          ['mutation', 'Perintah tulis API (pra-auth per sumber + pasca-auth per key)', 'closed (tolak saat store tak sehat)'],
          ['webhook', 'Inbound Telegram + generik per sumber', 'closed'],
          ['public_read', 'Bacaan publik', 'terbuka terbatas'],
        ]}
      />
      <DocP>Batas angka tiap kelas hidup di kebijakan runtime (bukan hardcode dokumen); respons 429 selalu membawa antrean tunggu eksplisit.</DocP>
      <DocCode
        language="bash"
        code={`HTTP/1.1 429 Too Many Requests
Retry-After: 7
Content-Type: application/json

{"error": {"code": "RATE_LIMITED", "message": "…", "fields": {"retryAfterSeconds": ["7"]}}}`}
      />
      <DocCallout tone="info">
        Aturan retry integrator: 503 → retry dengan backoff + idempotencyKey sama; 409 konflik → baca status dulu,
        jangan buta mengulang; 429 → tunggu Retry-After, jangan mempercepat.
      </DocCallout>
      <DocsPager slug="errors" />
    </div>
  );
}
