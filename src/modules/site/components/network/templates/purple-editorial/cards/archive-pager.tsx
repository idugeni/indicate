'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { PurpleEditorialPickCard } from '@/modules/site/components/network/templates/purple-editorial/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/purple-editorial/ui/section-heading';

export function PurpleEditorialArchivePager({
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
      renderCard={(article, index) => <PurpleEditorialPickCard key={article.id} article={article} index={index} />}
    />
  );
}
