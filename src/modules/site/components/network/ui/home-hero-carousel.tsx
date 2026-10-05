'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatDate, formatFullViews, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import type { AuthorAvatarSkin } from '@/modules/site/components/network/ui/author-avatar';
import { AuthorAvatar } from '@/modules/site/components/network/ui/author-avatar';

const ROTATE_MS = 6000;

export interface HomeCarouselSkin {
  readonly accent: string;
  readonly authorAvatar: AuthorAvatarSkin;
}

/**
 * Hero carousel berotasi dengan jeda saat hover, fokus, atau reduced-motion.
 *
 * @param articles - Cerita sorotan yang diputar.
 * @param skin - Aksen dan avatar tema template.
 * @returns Sorotan rotasi bernomor dengan stack teks in-flow.
 * @remarks Stack teks WAJIB in-flow (`relative`, `min-h-[24rem]`): versi
 * `absolute` memotong judul saat konten lebih tinggi dari gambar.
 */
export function HomeHeroCarousel({
  articles,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeCarouselSkin;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = articles.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setTimeout(() => setIndex((current) => (current + 1) % count), ROTATE_MS);
    return () => window.clearTimeout(id);
  }, [count, paused, index]);

  const activePosition = count === 0 ? 0 : index % count;
  const article = articles[activePosition];
  if (article === undefined) return null;

  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;

  return (
    <section
      aria-label="Sorotan utama"
      className="relative overflow-hidden rounded-2xl shadow-sm"
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) setPaused(true);
      }}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={(event) => {
        if (event.currentTarget.contains(event.target as Node | null)) setPaused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <Image
        unoptimized={!isLocalImageSrc(src)}
        fill
        src={src}
        alt={article.title}
        priority={activePosition === 0}
        className="object-cover"
        sizes="100vw"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
      <div className="relative flex min-h-[24rem] flex-col justify-end p-5 sm:min-h-[28rem] sm:p-8">
        {article.categoryName === null ? null : (
          <p className="m-0">
            <span
              className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold text-white shadow-md"
              style={{ backgroundColor: skin.accent }}
            >
              {article.categoryName}
            </span>
          </p>
        )}
        <h1 className="m-0 mt-3 max-w-3xl line-clamp-3 font-sans text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
          <Link href={article.href} className="transition-opacity hover:opacity-85">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-2 max-w-2xl line-clamp-2 font-sans text-sm leading-relaxed text-white/80">
          {article.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex min-w-0 items-center gap-2.5">
            <AuthorAvatar skin={skin.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
            <span className="m-0 truncate font-sans text-sm font-bold text-white">{publisherName}</span>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-xs tabular-nums text-white/70">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                {formatDate(article.publishedAt, 'short')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                {reading} mnt baca
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                {formatFullViews(article.viewCount)} pembaca
              </span>
              <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1" iconClassName="h-3 w-3 opacity-70" />
            </span>
          </p>
          <Link
            href={article.href}
            aria-label={`Baca selengkapnya: ${article.title}`}
            className="inline-flex h-11 flex-none items-center gap-2 rounded-full px-5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: skin.accent }}
          >
            Baca Selengkapnya
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {count > 1 ? (
          <ol aria-label="Navigasi sorotan" className="m-0 mt-5 flex list-none items-center gap-2 p-0">
            {articles.map((item, position) => {
              const active = position === activePosition;
              return (
                <li key={item.id} className="m-0 p-0">
                  <button
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={`Sorotan ${position + 1}: ${item.title}`}
                    aria-current={active ? 'true' : undefined}
                    className={`font-sans text-xs font-bold tabular-nums transition-all ${active ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        aria-hidden="true"
                        className="h-0.5 rounded-full transition-all"
                        style={{
                          width: active ? '1.5rem' : '0.75rem',
                          backgroundColor: active ? skin.accent : 'rgba(255,255,255,0.4)',
                        }}
                      />
                      {String(position + 1).padStart(2, '0')}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
