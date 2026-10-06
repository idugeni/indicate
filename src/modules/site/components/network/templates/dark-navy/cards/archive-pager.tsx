'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { DarkNavyPickCard } from '@/modules/site/components/network/templates/dark-navy/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/dark-navy/ui/section-heading';

export function DarkNavyArchivePager({
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
      renderCard={(article, index) => <DarkNavyPickCard key={article.id} article={article} index={index} />}
      gridClassName="sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
      pageSize={9}
    />
  );
}
