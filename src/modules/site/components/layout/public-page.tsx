import type { ReactNode } from 'react';

import { PageHeader } from '@/modules/site/components/layout/content';
import { CallToAction } from '@/modules/site/components/layout/site-shell';
import type { NavigationLink } from '@/ui/site/marketing-content';

/** Standard public page (PageHeader + body + CTA); `sections/` is landing-only, shared blocks live in `layout/`. */
export function PublicPage({
  eyebrow,
  title,
  description,
  meta,
  actions,
  trail,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly meta?: readonly string[];
  readonly actions?: ReactNode;
  readonly trail?: readonly NavigationLink[];
  readonly children: ReactNode;
}) {
  return (
    <div className="[counter-reset:site-section]">
      <PageHeader eyebrow={eyebrow} title={title} description={description} meta={meta} actions={actions} crumbs={trail} />
      {/* Jangan taruh spacing di sini: ritme vertikal milik tiap Section (py-16 md:py-24).
          Div ini hanya me-reset counter penomoran section — bukan constraint, bukan container. */}
      {children}
      <CallToAction />
    </div>
  );
}
