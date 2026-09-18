import type { Metadata } from 'next';

import { ABOUT_PRINCIPLES, ABOUT_STORY, SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { siteMetadata } from '@/ui/site/metadata-guard';
import {
  FeatureGrid,
  HeaderPrimaryCta,
  HeaderSecondaryCta,
  PRINCIPLE_ICONS,
  Prose,
  Section,
  StatBand,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

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
      meta={['Tanpa paket bertingkat', 'Aktif 1x24 jam', 'Berjalan terus', 'Dijawab manusia']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <HeaderPrimaryCta href="/contact">Hubungi Kami</HeaderPrimaryCta>
          <HeaderSecondaryCta href="/services">Lihat Layanan</HeaderSecondaryCta>
        </>
      }
    >
      <Section title="Cerita kami" eyebrow="Cerita">
        <Prose>
          <p className="m-0 font-sans text-lg leading-8 text-[#1a2430]">{ABOUT_STORY[0]}</p>
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
            { value: '1', label: 'Harga yang disepakati di depan' },
            { value: '24', label: 'Jam maks. aktivasi' },
            { value: '59', label: 'UPT aktif terdaftar' },
            { value: '0', label: 'Biaya tersembunyi' },
          ]}
        />
      </Section>
      <Section title="Prinsip yang kami pegang" eyebrow="Prinsip">
        <FeatureGrid items={withIcons(ABOUT_PRINCIPLES, PRINCIPLE_ICONS)} columns={3} />
      </Section>
    </PublicPage>
  );
}
