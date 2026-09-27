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
      gridClassName="sm:grid-cols-2"
    />
  );
}
