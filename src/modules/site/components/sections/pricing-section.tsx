import { Section } from '@/modules/site/components/layout/content';
import { WhatsAppCard } from '@/modules/site/components/pricing/whatsapp-card';

export function PricingSection() {
  return (
    <Section
      title="Punya portal berita sendiri, mulai hari ini"
      eyebrow="Harga"
      description="Tanpa katalog paket: hubungi kami, sepakati biaya di depan, dan mulai dipakai setelah aktivasi."
    >
      <WhatsAppCard message="Halo Indicate, saya ingin bertanya soal biaya." />
    </Section>
  );
}
