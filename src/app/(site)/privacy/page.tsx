import type { Metadata } from 'next';

import { PRIVACY_SECTIONS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { Section, LegalDocument } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Selaras UU PDP No. 27 Tahun 2022: 20 bagian yang menjelaskan kategori data, dasar hukum, pemisahan tenant, enkripsi, subprosesor, jadwal retensi, hak subjek data, dan prosedur permintaan — tanpa pelacak iklan, tanpa penjualan data.';

export function generateMetadata(): Metadata {
  return siteMetadata('Kebijakan Privasi', DESCRIPTION, '/privacy');
}

export default function PrivasiPage() {
  return (
    <PublicPage
      eyebrow="Hukum"
      title="Kebijakan Privasi"
      description={DESCRIPTION}
      meta={['Berlaku efektif 5 September 2026', '20 bagian berversi', 'Selaras UU PDP 27/2022']}
      trail={[{ href: '/', label: 'Beranda' }]}
    >
      <Section aria-label="Isi Kebijakan Privasi">
        <LegalDocument items={PRIVACY_SECTIONS} />
      </Section>
    </PublicPage>
  );
}
