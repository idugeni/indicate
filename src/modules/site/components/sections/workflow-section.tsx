import { CARD_CLASS, Section } from '@/modules/site/components/layout/content';
import { cn } from '@/ui/cn';
import { WORKFLOW_STEPS, type FeatureItem } from '@/ui/site/marketing-content';

export function WorkflowSection() {
  return (
    <Section
      title="Cara Kerjanya"
      eyebrow="Alur kerja"
      description="Lima tahapan terstruktur dari konfigurasi domain organisasi hingga orkestrasi distribusi artikel ke seluruh jaringan."
    >
      <ol className="m-0 grid list-none gap-x-8 gap-y-8 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {(WORKFLOW_STEPS as FeatureItem[]).map((step, index) => {
          const stepNumber = String(index + 1).padStart(2, '0');

          return (
            <li key={step.title} className="flex flex-col">
              <div className={cn(CARD_CLASS, 'h-full gap-0')}>
                <span className="font-mono text-xs font-semibold tabular-nums text-brass">
                  {stepNumber}
                </span>
                <h3 className="m-0 mt-3 font-sans text-sm font-semibold tracking-tight text-paper">
                  {step.title}
                </h3>
                <p className="m-0 mt-2 font-sans text-xs leading-relaxed text-paper-dim">
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
