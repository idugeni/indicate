import type { ComponentType } from 'react';
import { Radio } from 'lucide-react';
import { CARD_CLASS, ICON_BOX_CLASS, Section } from '@/modules/site/components/layout/content';
import { CAPABILITIES, type FeatureItem } from '@/ui/site/marketing-content';

type CapabilityItem = FeatureItem & {
  icon?: ComponentType<{ className?: string }>;
};

export function CapabilitiesSection() {
  return (
    <Section
      title="Kemampuan utama"
      eyebrow="Cakupan"
      description="Siap digunakan sejak hari pertama — tanpa instalasi terpisah per portal."
      tone="raised"
    >
      <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {(CAPABILITIES as CapabilityItem[]).map((cap) => {
          const Icon = cap.icon ?? Radio;

          return (
            <div key={cap.title} className={CARD_CLASS}>
              <div className={ICON_BOX_CLASS}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
                {cap.title}
              </h3>
              <p className="m-0 font-sans text-xs leading-relaxed text-paper-dim">
                {cap.description}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
