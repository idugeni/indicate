'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { RedEditorialHeroActions } from '@/modules/site/components/network/templates/red-editorial/cards/hero-actions';
import { articleImage, formatFullViews, formatDate, readingMinutes } from '@/modules/site/components/network/templates/red-editorial/lib/format';

const ROTATE_MS = 6000;

function splitAccent(title: string): { readonly head: string; readonly tail: string } {
  const words = title.trim().split(/\s+/u).filter(Boolean);
  const tail = words.pop() ?? '';
  return { head: words.join(' '), tail };
}

export function RedEditorialHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = articles.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [count, paused, index]);

  const article = articles[count === 0 ? 0 : index % count];
  if (article === undefined) return null;

  const src = articleImage(article);
  const kicker = article.categoryName ?? 'Sorotan';
  const place = article.publisherCity ?? article.attribution;
  const reading = readingMinutes(article);
  const { head, tail } = splitAccent(article.title);

  return (
    <section
      aria-label="Sorotan utama"
      className="grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="min-w-0">
        <p className="m-0 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--tpl-primary,#b91c1c)]">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--tpl-primary,#b91c1c)]" />
          {kicker}
        </p>
        <h1 className="m-0 mt-4 font-serif text-4xl font-bold leading-[1.12] tracking-tight text-[var(--tpl-ink,#230d0d)] sm:text-5xl">
          {head === '' ? (
            article.title
          ) : (
            <>
              {head} <span className="text-[var(--tpl-primary,#b91c1c)]">{tail}</span>
            </>
          )}
        </h1>
        <p className="m-0 mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--tpl-muted,#705050)]">
          {article.description}
        </p>
        <p className="m-0 mt-3 font-sans text-xs tabular-nums text-[var(--tpl-faint,#ac9393)]">
          {formatDate(article.publishedAt, 'medium')} · {reading} mnt baca · {formatFullViews(article.viewCount)} pembaca
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/${article.slug}`}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--tpl-primary,#b91c1c)] px-6 text-sm font-bold text-white transition-colors hover:bg-[var(--tpl-primary-dark,#7f1212)]"
          >
            Baca Selengkapnya
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <RedEditorialHeroActions slug={article.slug} title={article.title} />
        </div>
        {count > 1 ? (
          <div role="group" aria-label="Navigasi sorotan" className="m-0 mt-7 flex items-center justify-center gap-2 text-xs font-bold tabular-nums">
            {articles.map((item, position) => {
              const active = position === index % count;
              return (
                <span key={item.id} className="flex items-center gap-2">
                  {position > 0 ? (
                    <span aria-hidden="true" className="h-px w-6 bg-[var(--tpl-ring,#ecd3d3)]" />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={`Sorotan ${position + 1}: ${item.title}`}
                    aria-current={active}
                    className={
                      active
                        ? 'flex h-8 w-8 items-center justify-center rounded-full bg-[var(--tpl-primary,#b91c1c)] text-white shadow-sm'
                        : 'flex h-8 w-8 items-center justify-center rounded-full text-[var(--tpl-faint,#ac9393)] transition-colors hover:bg-[var(--tpl-primary-soft,#fbe3e3)] hover:text-[var(--tpl-primary,#b91c1c)]'
                    }
                  >
                    {String(position + 1).padStart(2, '0')}
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0">
        <Link
          href={`/${article.slug}`}
          aria-label={article.title}
          className="block overflow-hidden rounded-2xl shadow-md transition-shadow duration-200 hover:shadow-lg"
        >
          <Image
            unoptimized
            src={src}
            alt=""
            priority={index === 0}
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 750}
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        </Link>
        <p className="absolute bottom-4 left-4 m-0 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-xl bg-black/55 px-3.5 py-2.5 text-white backdrop-blur-sm">
          <MapPin className="h-4 w-4 flex-none text-red-300" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-bold leading-tight">{place}</span>
            <span className="block truncate text-[11px] leading-tight text-white/75">{kicker}</span>
          </span>
        </p>
        <Link
          href={`/${article.slug}`}
          aria-label={`Buka: ${article.title}`}
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--tpl-primary,#b91c1c)] text-white shadow-md transition-colors hover:bg-[var(--tpl-primary-dark,#7f1212)]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
