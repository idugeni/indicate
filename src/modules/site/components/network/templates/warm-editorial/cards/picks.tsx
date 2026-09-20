import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { WarmEditorialPickCard } from '@/modules/site/components/network/templates/warm-editorial/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/warm-editorial/ui/section-heading';

export function WarmEditorialPicks({
  articles,
  description,
  heading = 'Berita Pilihan',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly ArticleListItem[];
  readonly description: string;
  readonly heading?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading description={description}>{heading}</SectionHeading>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#b4532a] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {articles.map((article, index) => (
          <WarmEditorialPickCard key={article.id} article={article} index={index} />
        ))}
      </div>
    </section>
  );
}
