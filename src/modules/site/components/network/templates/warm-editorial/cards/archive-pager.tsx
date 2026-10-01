'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { WarmEditorialPickCard } from '@/modules/site/components/network/templates/warm-editorial/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/warm-editorial/ui/section-heading';

export function WarmEditorialArchivePager({
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
      renderCard={(article, index) => <WarmEditorialPickCard key={article.id} article={article} index={index} />}
      gridClassName="md:grid-cols-3"
      pageSize={12}
    />
  );
}
