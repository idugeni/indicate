import type { ReactNode } from 'react';

import type { IconComponent } from '@/modules/dashboard/components/dashboard-types';

/** Alias kept for existing call sites; new code should use `IconComponent`. */
export type SectionCardIcon = IconComponent;

export function SectionCard({
  icon: Icon,
  title,
  eyebrow,
  children,
}: {
  readonly icon: SectionCardIcon;
  readonly title: string;
  readonly eyebrow: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-label={title} className="border-t-2 border-hairline pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="m-0 flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
          <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
          {title}
        </h3>
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">{eyebrow}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
