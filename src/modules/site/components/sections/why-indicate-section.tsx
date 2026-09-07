import { Check } from 'lucide-react';
import { CARD_CLASS, NumberMark, Section } from '@/modules/site/components/layout/content';
import { VALUE_PROPOSITIONS, type FeatureItem } from '@/ui/site/marketing-content';

export function WhyIndicateSection() {
  return (
    <Section
      title="Mengapa Indicate"
      eyebrow="Pembeda"
      description="Enam pilar arsitektural yang membedakan platform redaksi terpusat dari instalasi situs lepas yang terfragmentasi."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(VALUE_PROPOSITIONS as FeatureItem[]).map((prop, index) => {
          return (
            <div key={prop.title} className={CARD_CLASS}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="m-0 flex items-start gap-2 font-sans text-base font-semibold tracking-tight text-paper">
                  <Check className="mt-1 h-4 w-4 flex-none text-signal" aria-hidden="true" />
                  {prop.title}
                </h3>
                <NumberMark index={index} className="flex-none" />
              </div>
              <p className="m-0 font-sans text-sm leading-relaxed text-paper-dim">
                {prop.description}
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
