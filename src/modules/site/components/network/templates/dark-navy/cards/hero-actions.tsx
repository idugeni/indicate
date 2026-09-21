'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

/** Hero actions: progressive share (system sheet or channel dialog). */
export function DarkNavyHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-card,#0e1a33)] text-[var(--tpl-muted,#9aa9c4)] ring-1 ring-[var(--tpl-ring,#1b2c4f)] transition-colors hover:text-[var(--tpl-primary,#2f7bff)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#2f7bff)]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <TemplateShareButton slug={slug} title={title} className={button} />
    </p>
  );
}
