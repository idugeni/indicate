'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { GreenMinimalPickCard } from '@/modules/site/components/network/templates/green-minimal/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/green-minimal/ui/section-heading';

export function GreenMinimalArchivePager({
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
      renderCard={(article, index) => <GreenMinimalPickCard key={article.id} article={article} index={index} />}
    />
  );
}
