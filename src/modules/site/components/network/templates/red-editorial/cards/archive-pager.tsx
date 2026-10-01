'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { RedEditorialPickCard } from '@/modules/site/components/network/templates/red-editorial/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/red-editorial/ui/section-heading';

export function RedEditorialArchivePager({
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
      renderCard={(article, index) => <RedEditorialPickCard key={article.id} article={article} index={index} />}
      gridClassName="md:grid-cols-2"
      pageSize={12}
    />
  );
}
