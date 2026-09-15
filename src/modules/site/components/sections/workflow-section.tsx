import { Section } from '@/modules/site/components/layout/content';
import { WORKFLOW_STEPS, type FeatureItem } from '@/ui/site/marketing-content';

export function WorkflowSection() {
  const steps = WORKFLOW_STEPS as FeatureItem[];
  return (
    <Section
      title="Dari obrolan pertama sampai tayang"
      eyebrow="Cara kerja"
      description="Lima tahap berurutan — Anda selalu tahu sedang di tahap mana dan apa berikutnya."
    >
      <ol className="m-0 list-none border-t border-hairline p-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.title}
              className="grid gap-2 border-b border-hairline py-7 sm:grid-cols-[minmax(0,5rem)_minmax(0,4fr)_minmax(0,7fr)] sm:gap-6 md:py-8"
            >
              <span aria-hidden="true" className="font-serif text-4xl font-medium tabular-nums text-paper-faint md:text-5xl">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="m-0 font-serif text-xl font-medium tracking-tight text-paper sm:text-2xl">
                {step.title}
              </h3>
              <div>
                <p className="m-0 max-w-2xl font-sans text-base leading-relaxed text-paper-dim">
                  {step.description}
                </p>
                {isLast ? (
                  <p className="m-0 mt-3 flex items-center gap-2 font-sans text-sm font-medium text-signal">
                    <span className="h-1.5 w-1.5 bg-signal" aria-hidden="true" />
                    Berjalan terus setelah tahap ini
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
