import type { Metadata } from 'next';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { getContactChannels, getFaqs } from '@/modules/content/site-content';
import { WhatsAppCard } from '@/modules/site/components/pricing/whatsapp-card';
import { CONTACT_CHECKLIST, GUARANTEES } from '@/ui/site/marketing-content';
import {
  CHANNEL_ICONS,
  FaqAccordion,
  FeatureGrid,
  GUARANTEE_ICONS,
  PrimaryCta,
  Prose,
  Section,
  toFaqGridItems,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Tidak ada daftar harga paket: hubungi kami, sepakati biaya di depan, dan organisasi Anda diaktifkan maksimal 1x24 jam — berjalan terus tanpa kedaluwarsa.';

export function generateMetadata(): Metadata {
  return siteMetadata('Harga', DESCRIPTION, '/pricing');
}

export default async function HargaPage() {
  const [channels, faqs] = await Promise.all([getContactChannels(), getFaqs()]);
  return (
    <PublicPage
      eyebrow="Harga"
      title="Satu harga yang disepakati, bukan katalog paket"
      description={DESCRIPTION}
      meta={['Aktif maks. 1x24 jam', 'Berjalan terus', 'Tanpa biaya tersembunyi']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <PrimaryCta href="/contact">Hubungi Kami</PrimaryCta>
        </>
      }
    >
      <Section title="Cara membeli" description="Tiga langkah, tanpa formulir rumit." eyebrow="Alur">
        <WhatsAppCard message="Halo Indicate, saya ingin bertanya soal biaya." />
      </Section>
      <Section title="Sebelum menghubungi" description="Siapkan info ini agar obrolan cepat menemukan angka." eyebrow="Persiapan">
        <Prose>
          <ul className="grid list-disc gap-2 pl-5 sm:grid-cols-2">
            {CONTACT_CHECKLIST.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Prose>
      </Section>
      <Section title="Jaminan kami" description="Komitmen yang tertulis, bukan sekadar janji." eyebrow="Jaminan" tone="band">
        <FeatureGrid items={withIcons(GUARANTEES, GUARANTEE_ICONS)} columns={2} />
      </Section>
      <Section
        title="Kanal lain"
        description="Selain WhatsApp, kami bisa dihubungi lewat kanal berikut."
        eyebrow="Kontak"
        tone="raised"
      >
        <FeatureGrid
          items={withIcons(
            channels.filter(
              (channel) => !channel.title.toLowerCase().includes('whatsapp'),
            ),
            CHANNEL_ICONS,
          )}
          columns={2}
        />
      </Section>
      <Section
        title="Masih ragu?"
        description="Jawaban singkat untuk pertanyaan yang paling sering masuk."
        eyebrow="FAQ"
        tone="raised"
      >
        <FaqAccordion items={toFaqGridItems(faqs, 6)} />
      </Section>
    </PublicPage>
  );
}
