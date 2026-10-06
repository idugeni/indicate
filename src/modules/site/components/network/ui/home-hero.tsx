import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Eye, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ArticleListItem } from '@/modules/delivery/models';
import { CommentCountSlot } from '@/modules/site/components/network/disqus/comment-count-badge';
import { AuthorAvatar, type AuthorAvatarSkin } from '@/modules/site/components/network/ui/author-avatar';
import { articleImage, formatDate, formatFullViews, isLocalImageSrc, readingMinutes, readableTextOnAccent } from '@/modules/site/components/network/ui/format';
import { HomeHeroCarousel } from '@/modules/site/components/network/ui/home-hero-carousel';

/** Varian hero homepage yang disepakati dari 5 mockup. */
export type HomeHeroVariant = 'split' | 'overlay' | 'carousel' | 'mosaic' | 'serif';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface HomeHeroSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly ink: string;
  readonly muted: string;
  readonly authorAvatar: AuthorAvatarSkin;
}

interface HomeHeroProps {
  readonly variant: HomeHeroVariant;
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeHeroSkin;
  readonly actions?: ReactNode;
}

/**
 * Satu mode hero homepage untuk 10 template.
 *
 * @param variant - Salah satu dari 5 gaya mockup yang disetujui.
 * @param articles - Cerita teratas halaman; varian memakai awalan yang dibutuhkan.
 * @param skin - Warna dan avatar tema template.
 * @param actions - Aksi bagikan milik template untuk varian split dan serif.
 * @returns Hero sorotan utama, null bila tanpa cerita.
 * @remarks Gambar pertama selalu `priority` (LCP); rotasi carousel berhenti
 * saat hover, fokus, atau `prefers-reduced-motion`.
 */
export function HomeHero({ variant, articles, skin, actions }: HomeHeroProps) {
  if (articles.length === 0) return null;
  switch (variant) {
    case 'overlay':
      return <OverlayHero articles={articles} skin={skin} />;
    case 'carousel':
      return <HomeHeroCarousel articles={articles} skin={{ accent: skin.accent, authorAvatar: skin.authorAvatar }} />;
    case 'mosaic':
      return <MosaicHero articles={articles} skin={skin} />;
    case 'serif':
      return <SerifHero articles={articles} skin={skin} actions={actions} />;
    case 'split':
    default:
      return <SplitHero articles={articles} skin={skin} actions={actions} />;
  }
}

function HeroMeta({
  article,
  light = false,
  comments = false,
}: {
  readonly article: ArticleListItem;
  readonly light?: boolean;
  readonly comments?: boolean;
}) {
  const item = 'inline-flex items-center gap-1';
  const icon = 'h-3 w-3 opacity-70';
  return (
    <span
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans text-xs tabular-nums ${light ? 'text-white/70' : 'text-slate-500'}`}
    >
      <span className={item}>
        <CalendarDays className={icon} aria-hidden="true" />
        {formatDate(article.publishedAt, 'short')}
      </span>
      <span className={item}>
        <Clock3 className={icon} aria-hidden="true" />
        {readingMinutes(article)} mnt baca
      </span>
      <span className={item}>
        <Eye className={icon} aria-hidden="true" />
        {formatFullViews(article.viewCount)} pembaca
      </span>
      {comments ? (
        <CommentCountSlot articleId={article.id} href={article.href} className={item} iconClassName={icon} />
      ) : null}
    </span>
  );
}

function CategoryBadge({ article, skin }: { readonly article: ArticleListItem; readonly skin: HomeHeroSkin }) {
  if (article.categoryName === null) return null;
  return (
    <p className="m-0">
      <span
        className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold shadow-md"
        style={{ backgroundColor: skin.accent, color: readableTextOnAccent(skin.accent) }}
      >
        {article.categoryName}
      </span>
    </p>
  );
}

function SplitHero({
  articles,
  skin,
  actions,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeHeroSkin;
  readonly actions?: ReactNode;
}) {
  const article = articles[0];
  if (article === undefined) return null;
  const src = articleImage(article);
  const publisherName = article.attribution;
  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Sorotan utama">
      <div className="order-2 min-w-0 lg:order-1">
        {article.categoryName === null ? null : (
          <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold" style={{ color: skin.accent }}>
            <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
            {article.categoryName}
          </p>
        )}
        <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl" style={{ color: skin.ink }}>
          <Link href={article.href} className="transition-opacity hover:opacity-80">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed" style={{ color: skin.muted }}>
          {article.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <div className="flex min-w-0 items-center gap-3">
            <AuthorAvatar skin={skin.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="md" />
            <div className="grid min-w-0 gap-1">
              <p className="m-0 truncate font-sans text-sm font-bold" style={{ color: skin.ink }}>
                {publisherName}
              </p>
              <HeroMeta article={article} comments />
            </div>
          </div>
          <div className="flex flex-none items-center gap-2">
            <Link
              href={article.href}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-85"
              style={{ backgroundColor: skin.accent }}
            >
              Baca Selengkapnya
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {actions}
          </div>
        </div>
      </div>
      <div className="relative order-1 min-w-0 lg:order-2">
        <Link
          href={article.href}
          aria-label={article.title}
          aria-hidden="true"
          tabIndex={-1}
          className="relative block overflow-hidden rounded-2xl shadow-sm transition-shadow duration-200 hover:shadow-md"
        >
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt=""
            priority
            className="aspect-[16/10] w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 750}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </Link>
      </div>
    </section>
  );
}

function OverlayHero({
  articles,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeHeroSkin;
}) {
  const article = articles[0];
  if (article === undefined) return null;
  const src = articleImage(article);
  const publisherName = article.attribution;
  return (
    <section aria-label="Sorotan utama" className="relative overflow-hidden rounded-2xl shadow-sm">
      <Image
        unoptimized={!isLocalImageSrc(src)}
        fill
        src={src}
        alt={article.title}
        priority
        className="object-cover"
        sizes="100vw"
      />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
      <div className="relative flex min-h-[24rem] flex-col justify-end p-5 sm:min-h-[28rem] sm:p-8">
        <CategoryBadge article={article} skin={skin} />
        <h1 className="m-0 mt-3 max-w-3xl line-clamp-3 font-sans text-2xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl">
          <Link href={article.href} className="transition-opacity hover:opacity-85">
            {article.title}
          </Link>
        </h1>
        <p className="m-0 mt-2 max-w-2xl line-clamp-2 font-sans text-sm leading-relaxed text-white/80">
          {article.description}
        </p>
        <p className="m-0 mt-4 flex min-w-0 items-center gap-2.5">
          <AuthorAvatar skin={skin.authorAvatar} name={publisherName} avatarUrl={article.publisherLogoUrl} size="sm" />
          <span className="m-0 truncate font-sans text-sm font-bold text-white">{publisherName}</span>
          <HeroMeta article={article} light />
        </p>
      </div>
    </section>
  );
}

function MosaicHero({
  articles,
  skin,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeHeroSkin;
}) {
  const [feature, ...side] = articles;
  if (feature === undefined) return null;
  const featureSrc = articleImage(feature);
  return (
    <section aria-label="Sorotan utama" className="grid items-stretch gap-5 lg:grid-cols-2">
      <Link
        href={feature.href}
        className="group relative block min-h-80 overflow-hidden rounded-2xl shadow-sm lg:min-h-full"
      >
        <Image
          unoptimized={!isLocalImageSrc(featureSrc)}
          fill
          src={featureSrc}
          alt=""
          aria-hidden="true"
          priority
          className="object-cover transition-all duration-300 ease-out group-hover:brightness-[1.06] group-hover:saturate-[1.05] motion-reduce:transition-none"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent opacity-90 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:transition-none" />
        <span className="absolute inset-x-0 bottom-0 block p-5 sm:p-6">
          <CategoryBadge article={feature} skin={skin} />
          <span className="mt-2 line-clamp-3 block font-sans text-xl font-extrabold leading-tight text-white sm:text-2xl">
            {feature.title}
          </span>
          <span className="mt-2 block">
            <HeroMeta article={feature} light />
          </span>
        </span>
      </Link>
      <ol className="m-0 grid list-none content-start gap-5 p-0">
        {side.slice(0, 2).map((article) => {
          const thumb = articleImage(article);
          return (
            <li key={article.id} className="m-0 min-w-0 p-0">
              <article className="flex min-w-0 gap-4">
                <Link
                  href={article.href}
                  aria-label={article.title}
                  className="relative block h-24 w-32 flex-none overflow-hidden rounded-xl sm:h-28 sm:w-44"
                >
                  <Image
                    unoptimized={!isLocalImageSrc(thumb)}
                    src={thumb}
                    alt=""
                    loading="lazy"
                    fill
                    sizes="(max-width: 640px) 128px, 176px"
                    className="object-cover"
                  />
                </Link>
                <span className="min-w-0 flex-1">
                  <CategoryBadge article={article} skin={skin} />
                  <Link
                    href={article.href}
                    className="mt-1.5 line-clamp-3 block font-sans text-[17px] font-bold leading-snug tracking-tight transition-opacity hover:opacity-80"
                    style={{ color: skin.ink }}
                  >
                    {article.title}
                  </Link>
                  <span className="mt-1.5 block">
                    <HeroMeta article={article} light={skin.tone === 'dark'} />
                  </span>
                </span>
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SerifHero({
  articles,
  skin,
  actions,
}: {
  readonly articles: readonly ArticleListItem[];
  readonly skin: HomeHeroSkin;
  readonly actions?: ReactNode;
}) {
  const article = articles[0];
  if (article === undefined) return null;
  const src = articleImage(article);
  const place = article.publisherCity ?? article.attribution;
  return (
    <section aria-label="Sorotan utama">
      <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
        {article.categoryName ?? 'Laporan Khusus'}
      </p>
      <h1 className="m-0 mt-3 max-w-4xl font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: skin.ink }}>
        <Link href={article.href} className="transition-opacity hover:opacity-85">
          {article.title}
        </Link>
      </h1>
      <p className="m-0 mt-4 max-w-2xl font-sans text-[15px] leading-relaxed" style={{ color: skin.muted }}>
        {article.description}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <HeroMeta article={article} comments />
        <span className="flex items-center gap-2">
          <Link
            href={article.href}
            className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-sans text-sm font-bold text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: skin.accent }}
          >
            Baca Cerita Lengkap
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {actions}
        </span>
      </div>
      <figure className="m-0 mt-6 overflow-hidden rounded-2xl shadow-sm">
        <Link href={article.href} aria-label={article.title} aria-hidden="true" tabIndex={-1} className="block">
          <Image
            unoptimized={!isLocalImageSrc(src)}
            src={src}
            alt=""
            priority
            className="aspect-[21/9] w-full object-cover"
            width={article.imageWidth ?? 1200}
            height={article.imageHeight ?? 514}
            sizes="100vw"
          />
        </Link>
        <figcaption className="flex items-center gap-1.5 px-1 py-2.5 font-sans text-xs" style={{ color: skin.muted }}>
          <MapPin className="h-3.5 w-3.5 flex-none" style={{ color: skin.accent }} aria-hidden="true" />
          <span className="truncate">{place}</span>
        </figcaption>
      </figure>
    </section>
  );
}
