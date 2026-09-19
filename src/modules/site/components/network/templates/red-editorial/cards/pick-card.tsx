import Image from 'next/image';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { articleImage, formatDate, isLocalImageSrc } from '@/modules/site/components/network/templates/red-editorial/lib/format';

export function RedEditorialPickCard({ article, index }: { readonly article: NetworkArticle; readonly index: number }) {
  const src = articleImage(article);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#ecd3d3]/70">
      <div className="overflow-hidden">
        <Image
          unoptimized={!isLocalImageSrc(src)}
          src={src}
          alt={article.title}
          loading={index < 2 ? 'eager' : 'lazy'}
          className="aspect-[16/10] w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
          width={article.imageWidth ?? 800}
          height={article.imageHeight ?? 500}
          sizes="(max-width: 768px) 100vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        {article.categoryName === null ? null : (
          <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-[#b91c1c]">
            {article.categoryName}
          </p>
        )}
        <h3 className="m-0 mt-1.5 line-clamp-3 font-serif text-lg font-bold leading-snug text-[#230d0d]">
          <Link href={`/${article.slug}`} className="transition-colors hover:text-[#b91c1c]">
            {article.title}
          </Link>
        </h3>
        <p className="m-0 mt-2 line-clamp-3 text-sm leading-relaxed text-[#705050]">
          {article.description}
        </p>
        <p className="m-0 mt-auto flex items-center justify-between gap-3 pt-4">
          <time dateTime={article.publishedAt} className="text-xs tabular-nums text-[#ac9393]">
            {formatDate(article.publishedAt, 'medium')}
          </time>
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[#b91c1c] ring-1 ring-[#ecd3d3]">
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          </span>
        </p>
      </div>
    </article>
  );
}
