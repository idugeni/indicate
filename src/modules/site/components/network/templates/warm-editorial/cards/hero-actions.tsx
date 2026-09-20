'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

/** Aksi hero: bagikan progresif (lembar sistem atau dialog kanal). */
export function WarmEditorialHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#b4532a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#b4532a)]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <TemplateShareButton slug={slug} title={title} className={button} />
    </p>
  );
}
