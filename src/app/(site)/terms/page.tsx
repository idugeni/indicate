import type { Metadata } from 'next';

import { TERMS_SECTIONS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { Section, DocSections } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Aturan main yang adil dan bisa dibaca manusia: paket, bayar, tenggang, dan hak Anda.';



export function generateMetadata(): Metadata {
  return siteMetadata('Ketentuan Layanan', DESCRIPTION, '/terms');
}

export default function KetentuanPage() {
  return (
    <PublicPage eyebrow="Hukum" title="Ketentuan Layanan" description={DESCRIPTION} trail={[{ href: '/', label: 'Beranda' }]}>
      <Section aria-label="Isi Ketentuan Layanan">
        <DocSections items={TERMS_SECTIONS} />
      </Section>
    </PublicPage>
  );
}
