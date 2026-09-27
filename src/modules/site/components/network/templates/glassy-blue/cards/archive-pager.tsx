'use client';

import type { ArticleListItem } from '@/modules/delivery/models';
import { TemplateArchivePager } from '@/modules/site/components/network/ui/archive-pager';
import { GlassyBluePickCard } from '@/modules/site/components/network/templates/glassy-blue/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/glassy-blue/ui/section-heading';

export function GlassyBlueArchivePager({
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
      renderCard={(article, index) => <GlassyBluePickCard key={article.id} article={article} index={index} />}
    />
  );
}
