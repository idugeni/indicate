import type { Metadata } from 'next';

import { TERMS_SECTIONS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { Section, LegalDocument } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Kontrak layanan Indicate yang lengkap dan dapat dibaca manusia: 24 bagian yang mengatur lingkup layanan, paket dan pembayaran, aktivasi 30 hari, masa tenggang 7 hari, keamanan, SLA, tanggung jawab editorial, hingga penyelesaian sengketa menurut hukum Indonesia.';

export function generateMetadata(): Metadata {
  return siteMetadata('Ketentuan Layanan', DESCRIPTION, '/terms');
}

export default function KetentuanPage() {
  return (
    <PublicPage
      eyebrow="Hukum"
      title="Ketentuan Layanan"
      description={DESCRIPTION}
      meta={['Berlaku efektif 7 September 2026', '24 bagian berversi', 'Hukum Indonesia']}
      trail={[{ href: '/', label: 'Beranda' }]}
    >
      <Section aria-label="Isi Ketentuan Layanan">
        <LegalDocument items={TERMS_SECTIONS} />
      </Section>
    </PublicPage>
  );
}
