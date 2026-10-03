import Image from 'next/image';
import Link from 'next/link';
import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { articleImage, formatFullViews, formatDate, isLocalImageSrc, readingMinutes } from '@/modules/site/components/network/ui/format';
import { AuthorAvatar } from '@/modules/site/components/network/ui/author-avatar';
import { TemplateShareButton } from '@/modules/site/components/network/ui/share-dialog';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

export function RedEditorialPickCard({ article, index }: { readonly article: ArticleListItem; readonly index: number }) {
  const src = articleImage(article);
  const reading = readingMinutes(article);
  const publisherName = article.attribution;
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
          <Link href={article.href} className="transition-colors hover:text-[#b91c1c]">
            {article.title}
          </Link>
        </h3>
        <p className="m-0 mt-2 line-clamp-3 text-sm leading-relaxed text-[#705050]">
          {article.description}
        </p>
        <p className="m-0 mt-3 flex min-w-0 items-center gap-2.5">
          <AuthorAvatar skin={RED_EDITORIAL.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
          <span className="m-0 truncate font-sans text-xs font-bold text-slate-800">
            {publisherName}
          </span>
        </p>
        <p className="m-0 mt-auto flex items-center justify-between gap-3 pt-4">
          <span className="text-xs tabular-nums text-[#ac9393]">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'short')}</time>
            {' · '}
            {reading} mnt baca
            {' · '}
            {formatFullViews(article.viewCount)} pembaca
            {' · '}
            <CommentCountSlot articleId={article.id} href={article.href} className="inline-flex items-center gap-1" />
          </span>
          <TemplateShareButton
            slug={article.slug}
            title={article.title}
            href={article.href}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[#b91c1c] ring-1 ring-[#ecd3d3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b91c1c]"
          />
        </p>
      </div>
    </article>
  );
}
