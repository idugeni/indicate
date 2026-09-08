import { connection } from 'next/server';
import { headers } from 'next/headers';

import { denied } from '@/core/routing/deny';
import { withApiAccess } from '@/core/observability/api-access';
import { deliveryComposition } from '@/modules/delivery';

/** Control-plane llms.txt (llmstxt.org): H1 + blockquote summary + H2 file lists, absolute URLs. */
function controlPlaneLlms(host: string): string {
  const origin = `https://${host}`;
  const lines = [
    '# Indicate',
    '',
    '> Indicate — One Signal, Multiple Distribution Channels. Platform sindikasi media multi-tenant: satu Dashboard terpusat mengoperasikan banyak portal berita di banyak domain dan region.',
    '',
    'Redaksi menulis satu artikel kanonik lalu menerbitkannya ke banyak situs sekaligus melalui antrean terisolasi per target, dengan isolasi tenant berbasis nama host eksak dan jejak audit hanya-tambah.',
    '',
    '## Layanan',
    `- [Layanan](${origin}/services): cakupan sindikasi, alur 5 langkah, dan jaminan tertulis.`,
    `- [Harga](${origin}/pricing): pembelian lewat kontak langsung tanpa katalog paket, beserta FAQ.`,
    `- [Tentang](${origin}/about): cerita, fakta operasional, dan prinsip Indicate.`,
    `- [FAQ](${origin}/faq): jawaban teknis, lisensi, dan infrastruktur.`,
    `- [Kontak](${origin}/contact): kanal surel, WhatsApp, dan Telegram.`,
    '',
    '## Legalitas',
    `- [Kebijakan Privasi](${origin}/privacy): penanganan data pembaca, media privat, dan retensi.`,
    `- [Ketentuan Layanan](${origin}/terms): tanggung jawab konten, keamanan akun, isolasi data, dan audit.`,
    `- [Peta Situs](${origin}/sitemap.xml): daftar URL untuk perayap mesin pencari.`,
    '',
  ];
  return lines.join('\n');
}

async function handleGET() {
  // Klasifikasi per-host: tetap dinamis per request (pengganti force-dynamic).
  await connection();
  const { resolver, config } = await deliveryComposition();
  const result = await resolver.classify((await headers()).get('host'));
  if (result.kind === 'control' && result.surface === 'dashboard') {
    return new Response(controlPlaneLlms(config.hosts.dashboard), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300',
      },
    });
  }
  return denied(result.kind === 'invalid' ? 400 : result.kind === 'ambiguous' ? 500 : 404);
}

export const GET = withApiAccess('GET /llms.txt', handleGET);
