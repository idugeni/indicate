import type { Metadata } from 'next';
import { PricingCards } from '@/modules/site/components/pricing/pricing-cards';
import { LeadForm } from '@/modules/site/components/pricing/lead-form';
import { siteMetadata } from '@/ui/site/metadata-guard';
import { loadPricingPackages } from '@/modules/site/components/pricing/pricing-server';
import { CompareTable } from '@/modules/site/components/pricing/compare-table';
import { FAQ_ITEMS, GUARANTEES } from '@/ui/site/marketing-content';
import {
  FaqAccordion,
  FeatureGrid,
  GUARANTEE_ICONS,
  PrimaryCta,
  Prose,
  SecondaryCta,
  Section,
  toFaqGridItems,
  withIcons,
} from '@/modules/site/components/layout/content';
import { PublicPage } from '@/modules/site/components/layout/public-page';

const DESCRIPTION =
  'Pilih paket sesuai besarnya jaringan berita Anda. Semua paket terima beres — website langsung tayang, tinggal dipakai menulis.';

export function generateMetadata(): Metadata {
  return siteMetadata('Paket', DESCRIPTION, '/pricing');
}

export default async function HargaPage() {
  const packages = await loadPricingPackages();
  return (
    <PublicPage
      eyebrow="Paket"
      title="Punya portal berita sendiri, mulai hari ini"
      description={DESCRIPTION}
      meta={['Aktif maks. 1x24 jam', 'Tenggang baca 7 hari', 'Berhenti kapan saja']}
      trail={[{ href: '/', label: 'Beranda' }]}
      actions={
        <>
          <PrimaryCta href="/sign-up">Mulai Sekarang</PrimaryCta>
          <SecondaryCta href="/contact">Tanya Dulu</SecondaryCta>
        </>
      }
    >
      <Section title="Paket transparan" description="Semua paket terima beres — website langsung tayang, tinggal dipakai menulis." eyebrow="Harga">
        <PricingCards packages={packages} />
        <Prose className="mt-8">
          <p className="m-0">
            Nama domain tetap milik Anda. Semua paket berlaku 30 hari dan bisa diperpanjang kapan saja —
            sebelum berakhir pun Anda tetap bisa membaca dan mengurus tagihan dengan tenang.
          </p>
        </Prose>
      </Section>
      <Section title="Bandingkan paket" description="Satu tabel, semua perbedaan penting." eyebrow="Perbandingan" tone="raised">
        <CompareTable />
      </Section>
      <Section title="Jaminan kami" description="Komitmen yang tertulis, bukan sekadar janji." eyebrow="Jaminan" tone="band">
        <FeatureGrid items={withIcons(GUARANTEES, GUARANTEE_ICONS)} columns={2} />
      </Section>
      <Section
        title="Butuh Enterprise?"
        description="Ceritakan kebutuhan (jumlah domain, wilayah, jadwal). Kami menghubungi maksimal 1x24 jam hari kerja."
        eyebrow="Kontak Enterprise"
      >
        <LeadForm />
      </Section>
      <Section
        title="Masih ragu?"
        description="Jawaban singkat untuk pertanyaan yang paling sering masuk."
        eyebrow="FAQ"
        tone="raised"
      >
        <FaqAccordion items={toFaqGridItems(FAQ_ITEMS, 6)} />
      </Section>
    </PublicPage>
  );
}
