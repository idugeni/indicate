'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { OrangeModernPickCard } from '@/modules/site/components/network/templates/orange-modern/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/orange-modern/ui/section-heading';

export function OrangeModernArchivePager({
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
      renderCard={(article, index) => <OrangeModernPickCard key={article.id} article={article} index={index} />}
    />
  );
}
