import type { Metadata } from 'next';

import { FAQ_ITEMS } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { buildFaqPageSchema } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { FaqAccordion, Section, SecondaryCta, toFaqGridItems } from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION = 'Pertanyaan yang paling sering diajukan tentang pengelolaan banyak domain berita dari satu tempat.';

export function generateMetadata(): Metadata {
  return siteMetadata('FAQ', DESCRIPTION, '/faq');
}

export default function FaqPage() {
  return (
    <PublicPage
      eyebrow="FAQ"
      title="Pertanyaan yang sering diajukan"
      description={DESCRIPTION}
      meta={[`${FAQ_ITEMS.length} jawaban singkat`, 'Tanpa antre tiket', 'Dijawab manusia']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={<SecondaryCta href="/contact">Masih Bingung? Hubungi Kami</SecondaryCta>}
    >
      <Section title="Semua jawaban" description="Klik pertanyaan untuk membuka jawabannya." eyebrow="Daftar">
        <FaqAccordion items={toFaqGridItems(FAQ_ITEMS)} />
      </Section>
      <JsonLd schemas={[buildFaqPageSchema(FAQ_ITEMS)]} />
    </PublicPage>
  );
}
