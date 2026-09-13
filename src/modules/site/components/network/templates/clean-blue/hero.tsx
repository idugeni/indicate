import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, Share2, Tag } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/clean-blue/shared';
import { formatDate } from '@/modules/site/components/network/templates/listing-shared';

export function CleanBlueHero({ article, authorName }: { readonly article: NetworkArticle; readonly authorName: string }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const authorInitial = (authorName || 'R').trim().slice(0, 1).toUpperCase();

  return (
    <section className="grid items-center gap-8 lg:grid-cols-2" aria-label="Sorotan utama">
      <div className="relative overflow-hidden rounded-2xl shadow-sm">
        <Image
          unoptimized={!isLocalImageSrc(src)}
          src={src}
          alt={article.title}
          priority
          className="aspect-[16/10] w-full object-cover"
          width={article.imageWidth ?? 1200}
          height={article.imageHeight ?? 750}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 font-sans text-xs font-medium text-white backdrop-blur-sm">
          <Tag className="h-3.5 w-3.5" aria-hidden="true" />
          {article.categoryName ?? 'Berita Utama'}
        </span>
      </div>

      <div>
        <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-[#1f6feb]">
          <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
          {article.categoryName ?? 'Nasional'}
        </p>
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
          <Link href={`/articles/${article.slug}`} className="hover:text-[#1f6feb]">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-slate-600">
          {article.description}
        </p>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="m-0 flex min-w-0 items-center gap-3">
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#1f6feb]/10 font-sans text-sm font-bold text-[#1f6feb]">
              {authorInitial}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-sans text-sm font-bold text-slate-900">
                {authorName}
              </span>
              <span className="block font-sans text-xs tabular-nums text-slate-500">
                {formatDate(article.publishedAt, 'medium')} · {reading} menit baca
              </span>
            </span>
          </p>
          <p className="m-0 flex flex-none items-center gap-2">
            <button
              type="button"
              aria-label="Simpan artikel"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
            >
              <Bookmark className="h-4 w-4" aria-hidden="true" />
            </button>
            <Link
              href={`/articles/${article.slug}`}
              aria-label="Bagikan artikel"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
