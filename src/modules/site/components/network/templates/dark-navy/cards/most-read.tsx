import Image from 'next/image';
import Link from 'next/link';
import { Flame } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { articleImage, formatCompactViews, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/templates/dark-navy/lib/format';

export function DarkNavyMostRead({ articles }: { readonly articles: readonly ArticleListItem[] }) {
  const items = articles.slice(0, 5);
  if (items.length === 0) return null;
  return (
    <aside
      aria-label="Paling banyak dibaca"
      className="rounded-2xl bg-[#0e1a33] p-5 shadow-sm ring-1 ring-[#1b2c4f] sm:p-6"
    >
      <p className="m-0 flex items-center gap-2 font-sans text-base font-extrabold tracking-tight text-[#eaf0fb]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#b91c1c]">
          <Flame className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        Paling Banyak Dibaca
      </p>
      <ol className="m-0 mt-2 list-none p-0">
        {items.map((article, position) => {
          const src = articleImage(article);
          return (
            <li
              key={article.id}
              className="m-0 flex items-center gap-3 border-t border-[#1b2c4f] p-0 py-3.5 first:border-t-0"
            >
              <span
                aria-hidden="true"
                className={`w-8 flex-none font-sans text-xl font-extrabold tabular-nums ${
                  position === 0 ? 'text-[#b91c1c]' : 'text-[#5f6f8c]'
                }`}
              >
                {String(position + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="m-0 line-clamp-2 font-sans text-sm font-bold leading-snug text-[#eaf0fb]">
                  <Link href={`/${article.slug}`} className="hover:text-[#2f7bff]">
                    {article.title}
                  </Link>
                </h3>
                <p className="m-0 mt-1 font-sans text-xs tabular-nums text-[#5f6f8c]">
                  {formatCompactViews(article.viewCount)} pembaca · {readingMinutes(article)} mnt baca
                </p>
              </div>
              <Image
                unoptimized={!isLocalImageSrc(src)}
                src={src}
                alt=""
                loading="lazy"
                className="h-14 w-14 flex-none rounded-xl object-cover"
                width={112}
                height={112}
                sizes="56px"
              />
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
