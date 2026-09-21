'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

/** Hero actions: progressive share (system sheet or channel dialog). */
export function RedEditorialHeroActions({ slug, title }: { readonly slug: string; readonly title: string }) {
  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#b91c1c)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#b91c1c)]';

  return (
    <p className="m-0 flex flex-none items-center gap-2">
      <TemplateShareButton slug={slug} title={title} className={button} />
    </p>
  );
}
