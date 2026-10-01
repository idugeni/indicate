'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { BlackLimePickCard } from '@/modules/site/components/network/templates/black-lime/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/black-lime/ui/section-heading';

export function BlackLimeArchivePager({
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
      renderCard={(article, index) => <BlackLimePickCard key={article.id} article={article} index={index} />}
      gridClassName="md:grid-cols-2"
      pageSize={6}
    />
  );
}
