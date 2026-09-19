'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { ArticleMeta } from '@/modules/site/components/network/templates/glassy-blue/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/glassy-blue/ui/author-avatar';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/glassy-blue/lib/format';
import { GlassyBlueHeroActions } from '@/modules/site/components/network/templates/glassy-blue/cards/hero-actions';

const ROTATE_MS = 6000;

/**
 * Sorotan utama dalam kartu kaca rounded-3xl gaya contoh Kabar.id.
 *
 * @param articles - Artikel sorotan yang dirotasi (indikator + panah fungsional).
 * @returns Kartu hero kaca dengan badge, meta penulis, dan panah lingkaran.
 */
export function GlassyBlueHero({ articles }: { readonly articles: readonly NetworkArticle[] }) {
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
  const reading = readingMinutes(article);
  const publisherName = article.attribution;
  const location = article.publisherCity;
  const position = count === 0 ? 0 : index % count;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section
      aria-label="Sorotan utama"
      className="relative overflow-hidden rounded-3xl bg-white/70 p-4 shadow-xl shadow-[#1f7cff]/10 ring-1 ring-white backdrop-blur-xl sm:p-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_minmax(0,1fr)] lg:gap-8">
        <Link
          href={`/${article.slug}`}
          aria-label={article.title}
          className="relative block overflow-hidden rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt=""
            priority={position === 0}
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 750}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 font-sans text-xs font-bold text-slate-800 shadow-sm backdrop-blur">
            #{(article.categoryName ?? 'Sorotan').replace(/\s+/g, '')}
          </span>
          {location === null || location === '' ? null : (
            <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-slate-900/70 to-transparent px-4 pb-3.5 pt-10 font-sans text-xs font-medium text-white">
              <MapPin className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
              {location}
            </span>
          )}
        </Link>

        <div className="min-w-0 px-1 py-1 sm:px-2">
          <div className="flex items-center justify-between gap-3">
            {article.categoryName === null ? (
              <span className="m-0 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-[#1f7cff]">
                <span aria-hidden="true" className="h-1 w-6 rounded-full bg-[#1f7cff]" />
                Sorotan
              </span>
            ) : (
              <p className="m-0 flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider text-[#1f7cff]">
                <span aria-hidden="true" className="h-1 w-6 rounded-full bg-[#1f7cff]" />
                {article.categoryName}
              </p>
            )}
            {count > 1 ? (
              <div className="flex flex-none items-center gap-1.5" role="group" aria-label="Pilih sorotan">
                <span className="mr-1 font-sans text-[11px] tabular-nums text-slate-400">
                  {String(position + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => go(position - 1)}
                  aria-label="Sorotan sebelumnya"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f7cff]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(position + 1)}
                  aria-label="Sorotan berikutnya"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f7cff]"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
          <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.12] tracking-tight text-[#0e1b33] sm:text-4xl">
            <Link href={`/${article.slug}`} className="hover:text-[#1f7cff]">
              {article.title}
            </Link>
          </h1>
          <p className="m-0 mt-3 line-clamp-3 font-sans text-[15px] leading-relaxed text-slate-600">
            {article.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
            <div className="flex min-w-0 items-center gap-3">
              <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
              <div className="grid min-w-0 gap-1">
                <p className="m-0 truncate font-sans text-sm font-bold text-slate-900">
                  {publisherName}
                </p>
                <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <GlassyBlueHeroActions slug={article.slug} title={article.title} />
              <Link
                href={`/${article.slug}`}
                aria-label={`Baca: ${article.title}`}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7cff] text-white shadow-lg shadow-[#1f7cff]/30 transition-colors hover:bg-[#155fd0]"
              >
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
