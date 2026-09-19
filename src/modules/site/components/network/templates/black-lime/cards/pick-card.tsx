import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/black-lime/lib/format';
import { badgeStyle } from '@/modules/site/components/network/templates/black-lime/theme';
import { ArticleMeta } from '@/modules/site/components/network/templates/black-lime/ui/article-meta';
import { AuthorAvatar } from '@/modules/site/components/network/templates/black-lime/ui/author-avatar';

export function BlackLimePickCard({ article, index }: { readonly article: NetworkArticle; readonly index: number }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const badge = badgeStyle(index);
  const publisherName = article.attribution;
  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-[#131711] text-slate-100 shadow-sm ring-1 ring-[#242b1f]">
      <div className="relative px-3 pt-3">
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
        {article.categoryName === null ? null : (
          <span
            className="absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md"
            style={badge}
          >
            {article.categoryName}
          </span>
        )}
      </div>
      <CardHeader className="flex-1 px-5 pt-4">
        <CardTitle className="line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-100">
          <Link href={`/${article.slug}`} className="hover:text-[#c5f82a]">
            {article.title}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-3 font-sans text-sm leading-relaxed text-slate-400">
          {article.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2.5 px-5 pb-1">
        <AuthorAvatar name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
        <p className="m-0 truncate font-sans text-xs font-bold text-slate-200">
          {publisherName}
        </p>
      </CardContent>
      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t border-[#242b1f] bg-[#131711] px-5 py-3.5">
        <ArticleMeta publishedAt={article.publishedAt} reading={reading} viewCount={article.viewCount} />
        <Link
          href={`/${article.slug}`}
          aria-label={`Baca: ${article.title}`}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#c5f82a] text-[#0a0c07] transition-colors hover:bg-[#9ecb14]"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
