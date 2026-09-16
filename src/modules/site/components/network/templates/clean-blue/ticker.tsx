'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { formatDate } from '@/modules/site/components/network/templates/clean-blue/shared';

const ROTATE_MS = 5000;
const MAX_ITEMS = 5;

function subscribeReduceMotion(onChange: () => void): () => void {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function subscribeTabHidden(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** Ticker TERKINI: rotasi otomatis 5 detik, jeda saat hover/fokus/tab tersembunyi, dot + panah untuk lompat manual. */
export function CleanBlueTicker({ articles }: { readonly articles: readonly NetworkArticle[] }) {
  const items = articles.slice(0, MAX_ITEMS);
  const [index, setIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
  const tabHidden = useSyncExternalStore(subscribeTabHidden, () => document.hidden, () => false);

  const running = items.length > 1 && !reduceMotion && !hovered && !focused && !tabHidden;

  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % items.length);
      setCycle((current) => current + 1);
    }, ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [running, cycle, items.length]);

  const go = (next: number) => {
    setIndex(((next % items.length) + items.length) % items.length);
    setCycle((current) => current + 1);
  };

  const article = items[index];
  if (article === undefined) return null;

  return (
    <div
      className="flex items-center gap-2.5 rounded-full bg-white py-2 pl-2 pr-2.5 shadow-sm ring-1 ring-slate-200/70 sm:gap-3 sm:pr-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-ticker-index={index}
      data-ticker-state={running ? 'running' : 'paused'}
    >
      <span className="flex flex-none items-center gap-1.5 rounded-full bg-[#1a5fd0] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white">
        <span aria-hidden="true" className={running ? 'ticker-live-dot' : 'h-1.5 w-1.5 rounded-full bg-white/60'} />
        TERKINI
      </span>
      <p
        key={article.id}
        className={`m-0 min-w-0 flex-1 truncate font-sans text-sm font-medium text-slate-800 ${reduceMotion ? '' : 'ticker-enter'}`}
        aria-live="polite"
      >
        <Link href={`/${article.slug}`} className="hover:text-[#1a5fd0]">
          {article.title}
        </Link>
      </p>
      <time dateTime={article.updatedAt} className="hidden flex-none font-sans text-xs tabular-nums text-slate-600 sm:block">
        {article.updatedAt !== article.publishedAt
          ? `Diperbarui ${formatDate(article.updatedAt, 'medium')}`
          : formatDate(article.publishedAt, 'medium')}
      </time>
      {items.length > 1 ? (
        <span className="hidden flex-none items-center gap-1.5 md:flex" aria-label="Pilih headline">
          {items.map((item, position) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(position)}
              aria-label={`Headline ${position + 1}: ${item.title}`}
              aria-current={position === index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                position === index ? 'w-5 bg-[#1a5fd0]' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
              }`}
            />
          ))}
        </span>
      ) : null}
      {items.length > 1 ? (
        <span className="flex flex-none items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Headline sebelumnya"
            className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Headline berikutnya"
            className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200 transition-colors hover:text-[#1a5fd0]"
          >
            <ChevronRight className="h-4 w-4 text-slate-600" aria-hidden="true" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
