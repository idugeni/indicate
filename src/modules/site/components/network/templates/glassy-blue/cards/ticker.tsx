'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { formatDate, tickerHeadline } from '@/modules/site/components/network/templates/glassy-blue/lib/format';
import { TICKER_INTERVAL_MS, TICKER_MAX_ITEMS, tickerPauseLabel, useTickerRotation } from '@/modules/site/components/network/ui/ticker-rotation';

export function GlassyBlueTicker({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const items = articles.slice(0, TICKER_MAX_ITEMS);
  const rotation = useTickerRotation(items.length);
  const { cycle, index, reason, reduceMotion, running } = rotation;

  const article = items[index];
  if (article === undefined) return null;

  return (
    <div
      className="relative flex flex-col items-stretch gap-2.5 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70 sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:py-2 sm:pl-2 sm:pr-3"
      {...rotation.interactionProps}
      data-ticker-index={index}
      data-ticker-state={running ? 'running' : 'paused'}
    >
      <span role="status" className="sr-only">
        {running ? 'Memutar headline terkini' : `Jeda: ${tickerPauseLabel(reason)}`}
      </span>
      {items.length > 1 && running && !reduceMotion ? (
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-1 h-[2px] overflow-hidden rounded-full sm:inset-x-24">
          <span
            key={cycle}
            className="ticker-progress block h-full w-full origin-left bg-[var(--tpl-primary,#1a5fd0)]"
            style={{ animationDuration: `${TICKER_INTERVAL_MS}ms`, animationPlayState: running ? 'running' : 'paused' }}
          />
        </span>
      ) : null}
      <span className="flex-none self-start rounded-full bg-[var(--tpl-primary,#1f7cff)] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white sm:self-auto">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className={running && !reduceMotion ? 'ticker-live-dot' : 'h-1.5 w-1.5 rounded-full bg-white/60'} />
          TERKINI
        </span>
      </span>
      <p
        key={article.id}
        className={`m-0 min-w-0 flex-1 font-sans text-[15px] font-medium leading-snug text-slate-800 line-clamp-2 sm:text-sm sm:line-clamp-1 ${reduceMotion ? '' : 'ticker-enter'}`}
        aria-live="polite"
      >
        <Link href={`/${article.slug}`} className="no-underline hover:text-[var(--tpl-primary,#1f7cff)]">
          {tickerHeadline(article)}
        </Link>
      </p>
      <time dateTime={article.updatedAt} className="hidden flex-none font-sans text-xs tabular-nums text-slate-600 sm:block">
        {article.updatedAt !== article.publishedAt
          ? `Diperbarui ${formatDate(article.updatedAt, 'medium')}`
          : formatDate(article.publishedAt, 'medium')}
      </time>
      <div className="flex items-center justify-between gap-2 sm:contents">
        {items.length > 1 ? (
          <span className="flex flex-none items-center gap-1.5" aria-label="Pilih headline">
            {items.map((item, position) => (
              <button
                key={item.id}
                type="button"
                onClick={(event) => rotation.navigate(event, position)}
                aria-label={`Headline ${position + 1}: ${tickerHeadline(item)}`}
                aria-current={position === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  position === index ? 'w-5 bg-[var(--tpl-primary,#1f7cff)]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </span>
        ) : null}
        {items.length > 1 ? (
          <span className="flex flex-none items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => rotation.navigate(event, index - 1)}
              aria-label="Headline sebelumnya"
              className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#1f7cff)]"
            >
              <ChevronLeft className="h-4 w-4 text-slate-600" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(event) => rotation.navigate(event, index + 1)}
              aria-label="Headline berikutnya"
              className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[var(--tpl-primary,#1f7cff)]"
            >
              <ChevronRight className="h-4 w-4 text-slate-600" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
