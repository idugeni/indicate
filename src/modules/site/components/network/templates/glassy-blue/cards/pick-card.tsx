import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/glassy-blue/lib/format';
import { badgeStyle } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/glassy-blue/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/glassy-blue/ui/author-avatar';

/**
 * Kartu Berita Pilihan 3 kolom: gambar rounded, badge pastel, panah lingkaran.
 *
 * @param article - Artikel yang ditampilkan.
 * @param index - Posisi kartu untuk varian badge pastel.
 * @returns Kartu pilihan kaca terang.
 */
export function GlassyBluePickCard({ article, index }: { readonly article: ArticleListItem; readonly index: number }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const badge = badgeStyle(index);
  const publisherName = article.attribution;
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70 transition-shadow duration-200 hover:shadow-lg hover:shadow-[#1f7cff]/10">
      <div className="px-3 pt-3">
        <div className="overflow-hidden rounded-xl">
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt={article.title}
            loading="lazy"
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 800}
            height={article.imageHeight ?? 500}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      </div>
      <CardHeader className="flex-1 px-5 pt-4">
        {article.categoryName === null ? null : (
          <p className="m-0">
            <span
              className="inline-block rounded-md px-2 py-0.5 font-sans text-[11px] font-bold"
              style={badge}
            >
              {article.categoryName}
            </span>
          </p>
        )}
        <CardTitle className="line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900">
          <Link href={`/${article.slug}`} className="hover:text-[#1f7cff]">
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 font-sans text-sm leading-relaxed text-slate-600">
          {article.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2.5 px-5 pb-1">
        <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
        <p className="m-0 truncate font-sans text-xs font-bold text-slate-800">
          {publisherName}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5">
        <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
        <Link
          href={`/${article.slug}`}
          aria-label={`Baca: ${article.title}`}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e3efff] text-[#1f7cff] transition-colors hover:bg-[#1f7cff] hover:text-white"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
