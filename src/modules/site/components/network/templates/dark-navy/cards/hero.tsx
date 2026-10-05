'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
// Unconditional: tenant images never use the Vercel optimizer (cost).
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatFullViews, formatDate, readingMinutes } from '@/modules/site/components/network/ui/format';
import { AuthorAvatar } from '@/modules/site/components/network/ui/author-avatar';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

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
        unoptimized
        fill
        src={src}
        alt={article.title}
        priority={index === 0}
        className="object-cover"
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
      {/* Stack ini WAJIB in-flow: kalau `absolute bottom-0`, konten yang lebih
          tinggi dari gambar akan terdorong ke atas keluar kotak lalu dipotong
          `overflow-hidden` — dan yang terpotong adalah judul, karena dia blok
          paling atas. `min-h-*` hanya memberi tinggi gambar, sedangkan
          pertumbuhan tinggi mengikuti isi. */}
      <div className="relative flex min-h-[24rem] flex-col justify-end p-4 sm:min-h-[26rem] sm:p-6">
        <h1 className="m-0 max-w-3xl line-clamp-3 font-sans text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:line-clamp-2 sm:text-4xl">
          <Link href={article.href} className="hover:text-[#9fc0ff]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#eaf0fb]/85 line-clamp-2">
          {article.description}
        </p>
        <p className="m-0 mt-3 flex min-w-0 items-center gap-2.5">
          <span className="flex-none rounded-full bg-white/90 p-0.5">
            <AuthorAvatar skin={DARK_NAVY.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
          </span>
          <span className="m-0 truncate font-sans text-sm font-bold text-white">
            {publisherName}
          </span>
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 flex min-w-0 items-center gap-2.5">
            <Link
              href={article.href}
              className="group inline-flex flex-none items-center gap-2.5 font-sans text-sm font-bold text-white"
              aria-label={`Baca selengkapnya: ${article.title}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--tpl-canvas,#070f22)] transition-colors group-hover:bg-[var(--tpl-primary,#2f7bff)] group-hover:text-white">
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
              Baca Selengkapnya
            </Link>
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-xs tabular-nums text-[#eaf0fb]/70">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                {formatDate(article.publishedAt, 'long')}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                {readingMinutes(article)} mnt baca
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                {formatFullViews(article.viewCount)} pembaca
              </span>
              <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1" iconClassName="h-3 w-3 opacity-70" />
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
                    aria-current={active ? 'true' : undefined}
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
