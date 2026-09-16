import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { CleanBluePickCard } from '@/modules/site/components/network/templates/clean-blue/pick-card';

export function CleanBluePicks({
  articles,
  description,
  heading = 'Berita Pilihan',
  linkHref = null,
  linkLabel = 'Lihat Semua',
}: {
  readonly articles: readonly NetworkArticle[];
  readonly description: string;
  readonly heading?: string;
  readonly linkHref?: string | null;
  readonly linkLabel?: string;
}) {
  if (articles.length === 0) return null;
  return (
    <section aria-label={heading}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1a5fd0]" />
            {heading}
          </h2>
          <p className="m-0 mt-1 font-sans text-sm text-slate-600">
            {description}
          </p>
        </div>
        {linkHref !== null ? (
          <Link
            href={linkHref}
            className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#1a5fd0] hover:underline"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {articles.map((article, index) => (
          <CleanBluePickCard key={article.id} article={article} index={index} />
        ))}
      </div>
    </section>
  );
}
