import { Section } from '@/modules/site/components/layout/content';
import { VALUE_PROPOSITIONS, type FeatureItem } from '@/ui/site/marketing-content';

export function WhyIndicateSection() {
  const [featured, ...rest] = VALUE_PROPOSITIONS as FeatureItem[];
  return (
    <Section
      title="Mengapa redaksi pindah ke Indicate"
      eyebrow="Pembeda"
      description="Bukan instalasi situs lepas yang terfragmentasi — satu ruang redaksi terpusat untuk seluruh jaringan."
    >
      {featured ? (
        <div className="max-w-3xl border-t-2 border-brass/70 pt-8">
          <h3 className="m-0 font-serif text-2xl font-medium leading-snug tracking-tight text-balance text-paper sm:text-3xl">
            {featured.title}
          </h3>
          <p className="m-0 mt-3 max-w-2xl font-sans text-base leading-relaxed text-paper-dim">
            {featured.description}
          </p>
        </div>
      ) : null}
      <div className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
        {rest.map((prop) => (
          <div key={prop.title} className="border-t border-hairline pt-5">
            <h3 className="m-0 font-serif text-xl font-medium tracking-tight text-paper">
              {prop.title}
            </h3>
            <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
              {prop.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
