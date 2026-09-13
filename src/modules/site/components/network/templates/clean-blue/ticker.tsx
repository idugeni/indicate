import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { tickerTime } from '@/modules/site/components/network/templates/clean-blue/shared';

export function CleanBlueTicker({ article }: { readonly article: NetworkArticle }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-3 shadow-sm ring-1 ring-slate-200/70 transition-shadow hover:shadow"
    >
      <span className="flex-none rounded-full bg-[#1f6feb] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white">
        TERKINI
      </span>
      <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-slate-800">
        {article.title}
      </span>
      <time dateTime={article.publishedAt} className="hidden flex-none font-mono text-xs tabular-nums text-slate-500 sm:block">
        {tickerTime(article.publishedAt)} WIB
      </time>
      <span className="flex flex-none items-center gap-1.5" aria-hidden="true">
        <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </span>
      </span>
    </Link>
  );
}
