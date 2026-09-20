'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, formatCompactViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/dark-navy/lib/format';

const ROTATE_MS = 6000;

export function DarkNavyHero({ articles }: { readonly articles: readonly ArticleListItem[] }) {
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

  return (
    <section
      aria-label="Sorotan utama"
      className="relative overflow-hidden rounded-2xl shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <Image
        unoptimized={!isLocalImageSrc(src)}
        src={src}
        alt={article.title}
        priority={index === 0}
        className="aspect-[16/10] w-full object-cover sm:aspect-[21/9]"
        width={article.imageWidth ?? 1600}
        height={article.imageHeight ?? 686}
        sizes="100vw"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--tpl-canvas,#070f22)] via-[#070f22]/55 to-transparent"
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 sm:p-6">
        {article.categoryName === null ? null : (
          <span className="inline-block rounded-lg bg-[var(--tpl-primary,#2f7bff)] px-3 py-1 font-sans text-xs font-bold text-white shadow-md">
            {article.categoryName}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <h1 className="m-0 max-w-3xl font-sans text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
          <Link href={`/${article.slug}`} className="hover:text-[#9fc0ff]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#eaf0fb]/85 line-clamp-2">
          {article.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex min-w-0 items-center gap-2.5">
            <Link
              href={`/${article.slug}`}
              className="group inline-flex flex-none items-center gap-2.5 font-sans text-sm font-bold text-white"
              aria-label={`Baca selengkapnya: ${article.title}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--tpl-canvas,#070f22)] transition-colors group-hover:bg-[var(--tpl-primary,#2f7bff)] group-hover:text-white">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              Baca Selengkapnya
            </Link>
            <span className="hidden font-sans text-xs tabular-nums text-[#eaf0fb]/70 sm:inline">
              {formatDate(article.publishedAt, 'medium')} · {readingMinutes(article)} mnt baca · {formatCompactViews(article.viewCount)} pembaca
            </span>
          </p>
          {count > 1 ? (
            <span className="flex flex-none items-center gap-1.5" role="group" aria-label="Pilih sorotan">
              {articles.map((item, position) => {
                const active = position === index % count;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={`Sorotan ${position + 1}: ${item.title}`}
                    aria-current={active}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      active ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                );
              })}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
