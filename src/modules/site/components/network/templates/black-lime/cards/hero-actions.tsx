'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

/** Hero actions: share button opening the channel dialog. */
export function BlackLimeHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-card,#131711)] text-[var(--tpl-muted,#a3ad9a)] ring-1 ring-[var(--tpl-ring,#242b1f)] transition-colors hover:text-[var(--tpl-primary,#c5f82a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#c5f82a)]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <TemplateShareButton slug={slug} title={title} className={button} />
    </p>
  );
}
