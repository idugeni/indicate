import { ArrowDown, ArrowRight } from 'lucide-react';
import { CARD_CLASS, Section } from '@/modules/site/components/layout/content';
import { cn } from '@/ui/cn';
import { WORKFLOW_STEPS, type FeatureItem } from '@/ui/site/marketing-content';

export function WorkflowSection() {
  const steps = WORKFLOW_STEPS as FeatureItem[];
  return (
    <Section
      title="Cara Kerjanya"
      eyebrow="Alur kerja"
      description="Lima tahapan terstruktur dari konfigurasi domain organisasi hingga orkestrasi distribusi artikel ke seluruh jaringan."
    >
      <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => {
          const stepNumber = String(index + 1).padStart(2, '0');
          const isLast = index === steps.length - 1;

          return (
            <li key={step.title} className="relative flex flex-col">
              {!isLast ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-[17px] left-1/2 z-10 -translate-x-1/2 rounded-full bg-bg p-0.5 text-brass/70 sm:hidden"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -right-[17px] z-10 hidden -translate-y-1/2 rounded-full bg-bg p-0.5 text-brass/70 lg:block"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </>
              ) : null}
              <div
                className={cn(
                  CARD_CLASS,
                  'h-full gap-0 transition-all duration-180 hover:-translate-y-0.5 hover:border-brass/60',
                  isLast && 'border-brass/70 hover:border-brass',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold tabular-nums text-brass">
                    {stepNumber}
                  </span>
                  <span aria-hidden="true" className="h-px flex-1 bg-hairline" />
                </div>
                <h3 className="m-0 mt-3 font-sans text-sm font-semibold tracking-tight text-paper">
                  {step.title}
                </h3>
                <p className="m-0 mt-2 font-sans text-xs leading-relaxed text-paper-dim">
                  {step.description}
                </p>
                {isLast ? (
                  <p className="m-0 mt-4 flex items-center gap-2 border-t border-hairline pt-3 font-mono text-[10px] uppercase tracking-wider text-signal">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                      <span className="absolute h-full w-full animate-ping rounded-full bg-signal/60" />
                      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                    </span>
                    Orkestrasi live
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
