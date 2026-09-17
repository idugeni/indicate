import type { Metadata } from 'next';

import { docsPageMetadata, docsRequestHost } from '@/modules/docs/page-meta';
import { DocsPager } from '@/modules/docs/components/docs-pager';
import { DocCallout, DocCode, DocH2, DocP, DocTitle, InlineCode } from '@/modules/docs/components/docs-ui';

export async function generateMetadata(): Promise<Metadata> {
  return docsPageMetadata(await docsRequestHost(), 'quickstart');
}

const BASE = 'https://api.indicate.web.id/api/v1/commands';

export default function QuickstartPage() {
  return (
    <div>
      <DocTitle title="Mulai cepat" description="Lima langkah dari kunci API pertama hingga publikasi tayang di banyak portal." />
      <DocH2>Langkah 1 — Minta API key</DocH2>
      <DocP>
        API key diterbitkan pemilik organisasi dari dashboard (<InlineCode>Integrasi → API key</InlineCode>) dengan scope
        sesuai kebutuhan (<InlineCode>article.manage</InlineCode>, <InlineCode>media.manage</InlineCode>,{' '}
        <InlineCode>publishing.request</InlineCode>, <InlineCode>publishing.read</InlineCode>). Simpan key baik-baik: key
        yang salah atau tanpa scope dijawab <InlineCode>404</InlineCode> non-disclosing, bukan 401.
      </DocP>
      <DocH2>Langkah 2 — Buat artikel kanonis</DocH2>
      <DocCode
        language="bash"
        code={`curl -s ${BASE} \\
  -H "Authorization: Bearer $INDICATE_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "action": "article.create",
    "payload": {
      "regionId": "<KANAL_REGION_UUID>",
      "slug": "rilis-pers-contoh-2026",
      "title": "Rilis Pers Contoh 2026",
      "body": "Paragraf pembuka.\\n\\nParagraf kedua dengan **fakta kunci**.",
      "source": "Redaksi",
      "tags": ["contoh"],
      "status": "draft"
    }
  }'`}
      />
      <DocH2>Langkah 3 — Unggah gambar (opsional)</DocH2>
      <DocP>
        Panggil <InlineCode>media.reserve</InlineCode> (dapatkan URL PUT bertanda + checksum SHA-256 yang diharapkan), PUT
        byte-nya, lalu <InlineCode>media.complete</InlineCode> untuk verifikasi HEAD dan aktivasi. Sisipkan{' '}
        <InlineCode>[gambar:1]</InlineCode> sebaris sendiri di body sesuai urutan unggah.
      </DocP>
      <DocCode
        language="bash"
        code={`# 1) reservasi → catat authorization.url + reservationId
curl -s ${BASE} \\
  -H "Authorization: Bearer $INDICATE_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "action": "media.reserve",
    "payload": {
      "filename": "liputan.jpg",
      "mediaType": "image/jpeg",
      "sizeBytes": 412876,
      "checksum": "<base64-sha256-43-char-plus-equals>",
      "purpose": "article-image",
      "owner": { "kind": "article", "articleId": "<ARTICLE_UUID>" }
    }
  }'

# 2) PUT byte ke authorization.url dengan requiredHeaders-nya
# 3) selesaikan:
curl -s ${BASE} \\
  -H "Authorization: Bearer $INDICATE_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{"action": "media.complete", "payload": {"reservationId": "<RESERVATION_UUID>"}}'`}
      />
      <DocH2>Langkah 4 — Minta saran varian, lalu publish</DocH2>
      <DocP>
        Publish multi-portal <strong>wajib</strong> membawa judul + deskripsi unik per portal. Minta sarannya dulu
        (tanpa efek tulis), periksa, lalu kirim bersama request dengan <InlineCode>idempotencyKey</InlineCode> unik.
      </DocP>
      <DocCode
        language="bash"
        code={`curl -s ${BASE} \\
  -H "Authorization: Bearer $INDICATE_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "action": "publication.request",
    "payload": {
      "articleId": "<ARTICLE_UUID>",
      "siteIds": ["<SITE_A_UUID>", "<SITE_B_UUID>"],
      "idempotencyKey": "rilis-contoh-2026-v1",
      "options": {},
      "overrides": {
        "<SITE_A_UUID>": {
          "title": "Rilis Pers Contoh — Sorotan Portal A",
          "description": "Ringkasan rilis untuk pembaca Portal A, berikut konteks dan dampaknya bagi warga."
        },
        "<SITE_B_UUID>": {
          "title": "Rilis Pers Contoh — Fokus Portal B",
          "description": "Liputan rilis disesuaikan untuk pembaca Portal B dengan konteks wilayah yang relevan."
        }
      }
    }
  }'`}
      />
      <DocH2>Langkah 5 — Pantau status</DocH2>
      <DocCode
        language="bash"
        code={`curl -s ${BASE} \\
  -H "Authorization: Bearer $INDICATE_API_KEY" \\
  -H 'Content-Type: application/json' \\
  -d '{"action": "publication.status", "payload": {"jobId": "<JOB_UUID>"}}'`}
      />
      <DocCallout tone="warn">
        Kunci idempoten yang dipakai ulang untuk request berbeda ditolak (<InlineCode>IDEMPOTENCY_CONFLICT</InlineCode>).
        Duplikat judul/deskripsi antar portal — termasuk terhadap yang sudah tayang — ditolak (
        <InlineCode>INVALID_INPUT</InlineCode> duplikat).
      </DocCallout>
      <DocsPager slug="quickstart" />
    </div>
  );
}
