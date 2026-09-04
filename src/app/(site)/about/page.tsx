import type { Metadata } from 'next';

import { ABOUT_PRINCIPLES, ABOUT_STORY, SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import {
  FeatureGrid,
  PRINCIPLE_ICONS,
  PrimaryCta,
  Prose,
  SecondaryCta,
  Section,
  StatBand,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Kami membangun Indicate karena lelah melihat redaksi kecil membayar mahal untuk sistem yang rumit. Satu ruang redaksi, banyak portal, terima beres.';

export function generateMetadata(): Metadata {
  return siteMetadata('Tentang', DESCRIPTION, '/about');
}

export default function TentangPage() {
  return (
    <PublicPage
      eyebrow="Tentang"
      title="Redaksi kecil berhak atas sistem besar"
      description={DESCRIPTION}
      meta={['4 paket transparan', 'Aktif 1x24 jam', 'Tenggang 7 hari', 'Dijawab manusia']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <PrimaryCta href="/contact">Hubungi Kami</PrimaryCta>
          <SecondaryCta href="/services">Lihat Layanan</SecondaryCta>
        </>
      }
    >
      <Section title="Cerita kami" eyebrow="Cerita">
        <Prose>
          <p className="m-0 font-sans text-lg leading-8 text-paper">{ABOUT_STORY[0]}</p>
          {ABOUT_STORY.slice(1).map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="m-0">
              {paragraph}
            </p>
          ))}
          <p className="m-0">{SERVICE_SUMMARY}</p>
        </Prose>
      </Section>
      <Section title="Angka yang kami pegang" eyebrow="Fakta" tone="raised">
        <StatBand
          items={[
            { value: '4', label: 'Paket dengan harga terbuka' },
            { value: '30', label: 'Hari masa aktif per langganan' },
            { value: '7', label: 'Hari tenggang baca' },
            { value: '24', label: 'Jam maks. aktivasi' },
          ]}
        />
      </Section>
      <Section title="Prinsip yang kami pegang" eyebrow="Prinsip">
        <FeatureGrid items={withIcons(ABOUT_PRINCIPLES, PRINCIPLE_ICONS)} columns={3} />
      </Section>
    </PublicPage>
  );
}
