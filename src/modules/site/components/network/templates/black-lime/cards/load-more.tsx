'use client';

import { useState } from 'react';
import { ArrowDown } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { BlackLimePickCard } from '@/modules/site/components/network/templates/black-lime/cards/pick-card';
import { SectionHeading } from '@/modules/site/components/network/templates/black-lime/ui/section-heading';

const PAGE_SIZE = 9;

export function BlackLimeLoadMore({
  articles,
  heading,
  description,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  if (articles.length === 0) return null;
  const visible = articles.slice(0, visibleCount);
  const remaining = articles.length - visible.length;
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4">
        <SectionHeading description={description}>{heading}</SectionHeading>
        <p className="m-0 flex-none font-sans text-xs tabular-nums text-slate-500" role="status">
          {visible.length}/{articles.length}
        </p>
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {visible.map((article, index) => (
          <BlackLimePickCard key={article.id} article={article} index={index} />
        ))}
      </div>

      {remaining > 0 ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#c5f82a] px-7 font-sans text-sm font-bold text-[#0a0c07] transition-colors hover:bg-[#9ecb14]"
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
            Muat lebih banyak ({remaining} lagi)
          </button>
        </div>
      ) : (
        <p className="m-0 mt-8 text-center font-sans text-xs text-slate-500">
          Anda telah melihat seluruh {articles.length} liputan kanal ini.
        </p>
      )}
    </section>
  );
}
