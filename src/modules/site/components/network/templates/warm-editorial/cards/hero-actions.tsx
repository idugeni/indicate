'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

/** Hero actions: share button opening the channel dialog. */
export function WarmEditorialHeroActions({ slug, title, href }: { readonly slug: string; readonly title: string; readonly href?: string | undefined }) {
  const button =
    'flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#b4532a)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#b4532a)]';

  return (
    <div className="m-0 flex flex-none items-center gap-2">
      <TemplateShareButton slug={slug} title={title} href={href} className={button} />
    </div>
  );
}
