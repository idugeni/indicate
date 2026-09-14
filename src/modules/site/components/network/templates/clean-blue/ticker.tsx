'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { tickerTime } from '@/modules/site/components/network/templates/clean-blue/shared';

const ROTATE_MS = 6000;
const MAX_ITEMS = 5;

/** Ticker TERKINI hidup: rotasi headline terkini otomatis + panah berfungsi. */
export function CleanBlueTicker({ articles }: { readonly articles: readonly NetworkArticle[] }) {
  const items = articles.slice(0, MAX_ITEMS);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (paused || reducedMotion || items.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, items.length]);

  const article = items[index];
  if (article === undefined) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-3 shadow-sm ring-1 ring-slate-200/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="flex-none rounded-full bg-[#1f6feb] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white">
        TERKINI
      </span>
      <p className="m-0 min-w-0 flex-1 truncate font-sans text-sm font-medium text-slate-800" aria-live="polite">
        <Link href={`/articles/${article.slug}`} className="hover:text-[#1f6feb]">
          {article.title}
        </Link>
      </p>
      <time dateTime={article.publishedAt} className="hidden flex-none font-mono text-xs tabular-nums text-slate-500 sm:block">
        {tickerTime(article.publishedAt)} WIB
      </time>
      <span className="flex flex-none items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIndex((current) => (current - 1 + items.length) % items.length)}
          aria-label="Headline sebelumnya"
          className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setIndex((current) => (current + 1) % items.length)}
          aria-label="Headline berikutnya"
          className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
        >
          <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
