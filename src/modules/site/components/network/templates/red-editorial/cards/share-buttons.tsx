'use client';

import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';

import type { ArticleListItem } from '@/modules/delivery/models';

/**
 * Single share trigger opening the channel dialog (system sheet on mobile).
 */
export function RedEditorialShareButtons({ article, canonical }: { readonly article: ArticleListItem; readonly canonical: string }) {
  return (
    <p className="m-0 flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto sm:justify-start" aria-label="Bagikan artikel">
      <TemplateShareButton
        slug={article.slug}
        title={article.title}
        url={canonical}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--tpl-primary,#b91c1c)] text-white transition-colors hover:bg-[var(--tpl-primary-dark,#7f1212)]"
      />
    </p>
  );
}
