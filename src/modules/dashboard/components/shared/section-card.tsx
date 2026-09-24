import type { ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IconComponent } from '@/modules/dashboard/components/dashboard-types';

export function SectionCard({
  icon: Icon,
  title,
  eyebrow,
  children,
}: {
  readonly icon: IconComponent;
  readonly title: string;
  readonly eyebrow: string;
  readonly children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      <Card className="rounded-lg border border-hairline bg-bg-raised shadow-none ring-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 font-sans text-sm font-semibold tracking-tight text-paper">
            <Icon className="h-4 w-4 text-brass" aria-hidden="true" />
            {title}
          </CardTitle>
          <CardDescription className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">{eyebrow}</CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</CardContent>
      </Card>
    </section>
  );
}
