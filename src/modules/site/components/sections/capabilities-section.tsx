import { Section } from '@/modules/site/components/layout/content';
import { CAPABILITIES, type FeatureItem } from '@/ui/site/marketing-content';

export function CapabilitiesSection() {
  return (
    <Section
      title="Semua yang dibutuhkan redaksi, sejak hari pertama"
      eyebrow="Kemampuan"
      description="Tanpa instalasi terpisah per portal — aktif bersamaan dengan organisasinya."
    >
      <dl className="m-0 grid gap-x-12 p-0 md:grid-cols-2">
        {(CAPABILITIES as FeatureItem[]).map((cap) => (
          <div key={cap.title} className="border-t border-hairline py-6">
            <dt className="font-sans text-base font-semibold tracking-tight text-paper">
              {cap.title}
            </dt>
            <dd className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
              {cap.description}
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
