import type { Metadata } from 'next';

import { PRIVACY_SECTIONS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { Section, DocSections } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

export const dynamic = 'force-dynamic';

const DESCRIPTION = 'Bahasa manusia untuk urusan data: apa yang disimpan, siapa bisa lihat, dan hak Anda.';



export function generateMetadata(): Metadata {
  return siteMetadata('Kebijakan Privasi', DESCRIPTION, '/privacy');
}

export default function PrivasiPage() {
  return (
    <PublicPage eyebrow="Hukum" title="Kebijakan Privasi" description={DESCRIPTION} trail={[{ href: '/', label: 'Beranda' }]}>
      <Section aria-label="Isi Kebijakan Privasi">
        <DocSections items={PRIVACY_SECTIONS} />
      </Section>
    </PublicPage>
  );
}
