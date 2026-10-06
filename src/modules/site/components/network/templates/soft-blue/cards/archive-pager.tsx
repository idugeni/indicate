'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { SoftBluePickCard } from '@/modules/site/components/network/templates/soft-blue/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/soft-blue/ui/section-heading';

export function SoftBlueArchivePager({
  articles,
  heading,
  description,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
}) {
  return (
    <TemplateArchivePager
      articles={articles}
      label={heading}
      header={<SectionHeading description={description}>{heading}</SectionHeading>}
      renderCard={(article, index) => <SoftBluePickCard key={article.id} article={article} index={index} />}
      /* Kartu soft-blue horizontal: gambar di kiri (w-32, lalu w-44 di sm) plus
         baris meta. `min-w-0` + `truncate` di kartu/meta membuat dua kolom aman
         sejak `sm`; satu kolom hanya di bawah 640px. */
      gridClassName="sm:grid-cols-2 lg:grid-cols-2"
      pageSize={6}
    />
  );
}
