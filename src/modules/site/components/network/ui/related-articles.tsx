import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye, TrendingUp } from 'lucide-react';

import type { ArticleListItem } from '@/modules/delivery/models';
import {
  ArticlePickCard,
  type PickCardBadgeStyle,
  type PickCardSkin,
} from '@/modules/site/components/network/cards/article-pick-card';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import type { AuthorAvatarSkin } from '@/modules/site/components/network/ui/author-avatar';
import { articleImage, formatDate, formatFullViews, isLocalImageSrc, readableTextOnAccent, readingMinutes } from '@/modules/site/components/network/ui/format';

/** Varian related-article yang disepakati: 6 gaya untuk 10 template. */
export type RelatedVariant = 'grid' | 'numbered' | 'carousel' | 'split-feature' | 'overlay' | 'minimal';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface RelatedSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly card: string;
  readonly ring: string;
  readonly ink: string;
  readonly muted: string;
  readonly authorAvatar: AuthorAvatarSkin;
}

interface RelatedArticlesProps {
  readonly variant: RelatedVariant;
  readonly articles: readonly ArticleListItem[];
  readonly pool: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}

/**
 * Satu mode artikel terkait untuk 10 template.
 *
 * @param variant - Salah satu dari 6 gaya yang disetujui.
 * @param articles - Artikel terkait pilihan redaksi (sudah dibatasi pemanggil).
 * @param pool - Koleksi artikel situs untuk pengisi dan peringkat populer; tanpa fetch tambahan.
 * @param heading - Judul seksi.
 * @param description - Deskripsi seksi.
 * @param skin - Warna aksen dan nada dari tema template.
 * @returns Seksi artikel terkait sesuai varian, null bila kosong.
 */
export function RelatedArticles({ variant, articles, pool, heading, description, skin }: RelatedArticlesProps) {
  if (articles.length === 0) return null;
  switch (variant) {
    case 'numbered':
      return <NumberedRelated articles={articles} pool={pool} heading={heading} description={description} skin={skin} />;
    case 'carousel':
      return <CarouselRelated articles={articles} heading={heading} description={description} skin={skin} />;
    case 'split-feature':
      return <SplitFeatureRelated articles={articles} pool={pool} heading={heading} description={description} skin={skin} />;
    case 'overlay':
      return <OverlayRelated articles={articles} heading={heading} description={description} skin={skin} />;
    case 'minimal':
      return <MinimalRelated articles={articles} pool={pool} heading={heading} description={description} skin={skin} />;
    case 'grid':
    default:
      return <GridRelated articles={articles} heading={heading} description={description} skin={skin} />;
  }
}

function badgeFor(skin: RelatedSkin): (index: number) => PickCardBadgeStyle {
  return () => ({ color: skin.accent, backgroundColor: `${skin.accent}1A` });
}

function pickSkin(skin: RelatedSkin): PickCardSkin {
  const dark = skin.tone === 'dark';
  return {
    cardClass: dark
      ? 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white/5 text-slate-100 shadow-sm ring-1 ring-white/10'
      : 'flex h-full flex-col overflow-hidden rounded-2xl border-0 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/60',
    imageWrapperClass: 'relative px-3 pt-3',
    badgePlacement: 'overlay',
    badgeClass: 'absolute left-6 top-6 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md',
    badgeStyle: badgeFor(skin),
    headerClass: 'flex-1 px-5 pt-4',
    titleClass: dark
      ? 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-100'
      : 'line-clamp-2 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900',
    titleLinkClass: 'transition-opacity hover:opacity-80',
    descriptionClass: dark
      ? 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-300'
      : 'line-clamp-3 font-sans text-sm leading-relaxed text-slate-600',
    publisherClass: dark
      ? 'm-0 truncate font-sans text-xs font-bold text-slate-200'
      : 'm-0 truncate font-sans text-xs font-bold text-slate-800',
    footerClass: dark
      ? 'mt-auto flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5'
      : 'mt-auto flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5',
    arrowClass: dark
      ? 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/10 text-slate-100 transition-colors hover:bg-white/20'
      : 'flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200',
    avatarSkin: skin.authorAvatar,
    Meta: RelatedMeta,
  };
}

function RelatedMeta({
  publishedAt,
  reading,
  viewCount,
  articleId,
  href,
}: {
  readonly publishedAt: string;
  readonly reading: number;
  readonly viewCount: number;
  readonly articleId: string;
  readonly href: string;
}) {
  const item = 'inline-flex items-center gap-1.5';
  const icon = 'h-3.5 w-3.5 opacity-70';
  return (
    <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-sans text-xs tabular-nums opacity-80">
      <span className={item}>
        <CalendarDays className={icon} aria-hidden="true" />
        {formatDate(publishedAt, 'short')}
      </span>
      <span className={item}>
        <Clock3 className={icon} aria-hidden="true" />
        {reading} mnt baca
      </span>
      <span className={item}>
        <Eye className={icon} aria-hidden="true" />
        {formatFullViews(viewCount)} pembaca
      </span>
      <CommentCountSlot articleId={articleId} href={href} className={item} iconClassName={icon} />
    </span>
  );
}

function RelatedHeading({
  heading,
  description,
  skin,
}: {
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const dark = skin.tone === 'dark';
  return (
    <div>
      <h2
        className={`m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight ${dark ? 'text-slate-100' : 'text-slate-900'}`}
      >
        <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
        {heading}
      </h2>
      {description === '' ? null : (
        <p className={`m-0 mt-1 font-sans text-sm ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{description}</p>
      )}
    </div>
  );
}

function fillFromPool(
  shown: readonly ArticleListItem[],
  pool: readonly ArticleListItem[],
  count: number,
): readonly ArticleListItem[] {
  if (shown.length >= count) return shown.slice(0, count);
  const ids = new Set(shown.map((article) => article.id));
  return [...shown, ...pool.filter((article) => !ids.has(article.id))].slice(0, count);
}

function popularFromPool(
  shown: readonly ArticleListItem[],
  pool: readonly ArticleListItem[],
  count: number,
): readonly ArticleListItem[] {
  const ids = new Set(shown.map((article) => article.id));
  return [...pool]
    .filter((article) => !ids.has(article.id))
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, count);
}

function GridRelated({
  articles,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const cardSkin = pickSkin(skin);
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {articles.map((article, index) => (
          <ArticlePickCard key={article.id} article={article} index={index} skin={cardSkin} />
        ))}
      </div>
    </section>
  );
}

function NumberedRelated({
  articles,
  pool,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly pool: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const cardSkin = pickSkin(skin);
  const grid = articles.slice(0, 4);
  const popular = popularFromPool(grid, pool, 5);
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid content-start items-stretch gap-5 sm:grid-cols-2">
          {grid.map((article, index) => (
            <ArticlePickCard key={article.id} article={article} index={index} skin={cardSkin} />
          ))}
        </div>
        <aside aria-label="Paling banyak dibaca" className="min-w-0 space-y-6 self-start lg:sticky lg:top-20">
          {popular.length > 0 ? (
            <div
              className="rounded-2xl p-5 shadow-sm"
              style={{ backgroundColor: skin.card, border: `1px solid ${skin.ring}` }}
            >
              <p className="m-0 flex items-center gap-2 font-sans text-sm font-bold" style={{ color: skin.ink }}>
                <TrendingUp className="h-4 w-4" style={{ color: skin.accent }} aria-hidden="true" />
                Paling Banyak Dibaca
              </p>
              <ol className="m-0 mt-4 list-none space-y-4 p-0">
                {popular.map((article, position) => {
                  const thumb = articleImage(article);
                  return (
                    <li
                      key={article.id}
                      className="m-0 flex items-start gap-3 border-b p-0 pb-4 last:border-b-0 last:pb-0"
                      style={{ borderColor: skin.ring }}
                    >
                      <span
                        aria-hidden="true"
                        className="w-7 flex-none font-serif text-xl font-bold tabular-nums"
                        style={{ color: skin.accent }}
                      >
                        {String(position + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link
                          href={article.href}
                          className="line-clamp-2 block font-sans text-sm font-bold leading-snug transition-opacity hover:opacity-80"
                          style={{ color: skin.ink }}
                        >
                          {article.title}
                        </Link>
                        <span
                          className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-[11px] tabular-nums"
                          style={{ color: skin.muted }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                            {formatDate(article.publishedAt, 'short')}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                            {formatFullViews(article.viewCount)} pembaca
                          </span>
                        </span>
                      </span>
                      <Image
                        unoptimized={!isLocalImageSrc(thumb)}
                        src={thumb}
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
            </div>
          ) : null}
          <div
            className="relative overflow-hidden rounded-2xl p-6 text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${skin.accent}, ${skin.accent}99)` }}
          >
            <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Perspektif</p>
            <blockquote className="m-0 mt-3 font-serif text-2xl font-bold leading-snug">
              &ldquo;Setiap cerita punya dampak.&rdquo;
            </blockquote>
            <p className="m-0 mt-4 border-t border-white/20 pt-3 font-sans text-xs leading-relaxed text-white/90">
              <span className="block font-bold text-white">Redaksi</span>
              Liputan terverifikasi dari lapangan.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function CarouselRelated({
  articles,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const cardSkin = pickSkin(skin);
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <div className="mt-5 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2">
        {articles.map((article, index) => (
          <div key={article.id} className="w-72 flex-none snap-start sm:w-80">
            <ArticlePickCard
              article={article}
              index={index}
              skin={cardSkin}
              sizes="(max-width: 640px) 288px, 320px"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SplitFeatureRelated({
  articles,
  pool,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly pool: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const dark = skin.tone === 'dark';
  const feature = articles[0];
  if (feature === undefined) return null;
  const rest = fillFromPool(articles.slice(1), pool.filter((article) => article.id !== feature.id), 4);
  const featureSrc = articleImage(feature);
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Link href={feature.href} className="group block min-w-0">
          <span className="block overflow-hidden rounded-2xl">
            <Image
              unoptimized={!isLocalImageSrc(featureSrc)}
              src={featureSrc}
              alt={feature.title}
              loading="lazy"
              width={feature.imageWidth ?? 800}
              height={feature.imageHeight ?? 450}
              sizes="(max-width: 1024px) 100vw, 66vw"
              className="aspect-[16/9] w-full object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] group-hover:saturate-[1.05] motion-reduce:transition-none"
            />
          </span>
          {feature.categoryName === null ? null : (
            <span
              className="mt-4 inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
              style={{ color: skin.accent, backgroundColor: `${skin.accent}1A` }}
            >
              {feature.categoryName}
            </span>
          )}
          <span
            className={`mt-2 block font-sans text-2xl font-extrabold leading-tight tracking-tight transition-opacity group-hover:opacity-80 ${dark ? 'text-slate-100' : 'text-slate-900'}`}
          >
            {feature.title}
          </span>
          <span className={`mt-2 line-clamp-2 block font-sans text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
            {feature.description}
          </span>
        </Link>
        <ol className="m-0 grid list-none content-start gap-5 p-0">
          {rest.map((article) => {
            const thumb = articleImage(article);
            return (
              <li key={article.id} className="m-0 flex min-w-0 items-start gap-4 p-0">
                <Link
                  href={article.href}
                  aria-label={article.title}
                  className="relative block h-20 w-28 flex-none overflow-hidden rounded-xl"
                >
                  <Image
                    unoptimized={!isLocalImageSrc(thumb)}
                    src={thumb}
                    alt=""
                    loading="lazy"
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </Link>
                <span className="min-w-0 flex-1">
                  <Link
                    href={article.href}
                    className={`line-clamp-3 block font-sans text-[15px] font-bold leading-snug transition-opacity hover:opacity-80 ${dark ? 'text-slate-100' : 'text-slate-900'}`}
                  >
                    {article.title}
                  </Link>
                  <span
                    className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {formatDate(article.publishedAt, 'short')}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3 w-3 opacity-70" aria-hidden="true" />
                      {readingMinutes(article)} mnt baca
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function OverlayRelated({
  articles,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <div className="mt-5 grid items-stretch gap-5 md:grid-cols-3">
        {articles.map((article) => {
          const src = articleImage(article);
          return (
            <Link
              key={article.id}
              href={article.href}
              className="group relative block min-h-72 overflow-hidden rounded-2xl shadow-sm"
            >
              <Image
                unoptimized={!isLocalImageSrc(src)}
                src={src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] group-hover:saturate-[1.05] motion-reduce:transition-none"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent opacity-90 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none" />
              <span className="absolute inset-x-0 bottom-0 block p-5">
                {article.categoryName === null ? null : (
                  <span
                    className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
                    style={{ color: readableTextOnAccent(skin.accent), backgroundColor: skin.accent }}
                  >
                    {article.categoryName}
                  </span>
                )}
                <span className="mt-2 line-clamp-3 block font-sans text-lg font-bold leading-snug text-white">
                  {article.title}
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tabular-nums text-white/75">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatDate(article.publishedAt, 'short')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatFullViews(article.viewCount)} pembaca
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MinimalRelated({
  articles,
  pool,
  heading,
  description,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly pool: readonly ArticleListItem[];
  readonly heading: string;
  readonly description: string;
  readonly skin: RelatedSkin;
}) {
  const dark = skin.tone === 'dark';
  const rows = fillFromPool(articles, pool, 5);
  return (
    <section className="cv-auto">
      <RelatedHeading heading={heading} description={description} skin={skin} />
      <ol className="m-0 mt-2 list-none p-0">
        {rows.map((article) => (
          <li key={article.id} className="m-0 border-b p-0 py-4 last:border-b-0" style={{ borderColor: skin.ring }}>
            <Link href={article.href} className="group flex min-w-0 items-center gap-4">
              <span className="min-w-0 flex-1">
                {article.categoryName === null ? null : (
                  <span className="block font-sans text-[11px] font-bold uppercase tracking-wider" style={{ color: skin.accent }}>
                    {article.categoryName}
                  </span>
                )}
                <span
                  className={`mt-0.5 line-clamp-2 block font-sans text-[17px] font-bold leading-snug tracking-tight transition-opacity group-hover:opacity-80 ${dark ? 'text-slate-100' : 'text-slate-900'}`}
                >
                  {article.title}
                </span>
                <span
                  className={`mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs tabular-nums ${dark ? 'text-slate-300' : 'text-slate-600'}`}
                >
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatDate(article.publishedAt, 'short')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3 opacity-70" aria-hidden="true" />
                    {formatFullViews(article.viewCount)} pembaca
                  </span>
                </span>
              </span>
              <span
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full transition-colors"
                style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
                aria-hidden="true"
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
