import { Section } from '@/modules/site/components/layout/content';
import { WhatsAppCard } from '@/modules/site/components/pricing/whatsapp-card';
import { GUARANTEES, type FeatureItem } from '@/ui/site/marketing-content';

export function PricingSection() {
  return (
    <Section
      title="Punya portal berita sendiri, mulai hari ini"
      eyebrow="Harga"
      description="Tanpa katalog paket: hubungi kami, sepakati biaya di depan, dan mulai dipakai setelah aktivasi."
      tone="soft"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
        <div className="border-t border-hairline">
          {(GUARANTEES as FeatureItem[]).map((guarantee) => (
            <div key={guarantee.title} className="grid gap-1 border-b border-hairline py-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,5fr)] sm:gap-6">
              <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
                {guarantee.title}
              </h3>
              <p className="m-0 font-sans text-sm leading-relaxed text-paper-dim">
                {guarantee.description}
              </p>
            </div>
          ))}
        </div>
        <div className="lg:sticky lg:top-24">
          <WhatsAppCard message="Halo Indicate, saya ingin bertanya soal biaya." />
        </div>
      </div>
    </Section>
  );
}
