import { Section } from '@/modules/site/components/layout/content';
import { PricingCards } from '@/modules/site/components/pricing/pricing-cards';
import { loadPricingPackages } from '@/modules/site/components/pricing/pricing-server';

export async function PricingSection() {
  const packages = await loadPricingPackages();
  return (
    <Section
      title="Punya portal berita sendiri, mulai hari ini"
      eyebrow="Paket"
      description="Semua paket terima beres — website langsung tayang, tinggal dipakai menulis."
    >
      <PricingCards packages={packages} />
    </Section>
  );
}
