import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { NetworkArticle } from '@/modules/delivery/models';
import { EditorialImage } from '@/modules/site/components/editorial-image';
import { ArticleActionStrip } from '@/modules/site/components/network/ui/article-action-strip';
import { ArticleBylineMeta } from '@/modules/site/components/network/ui/article-byline-meta';
import { AuthorAvatar, type AuthorAvatarSkin } from '@/modules/site/components/network/ui/author-avatar';
import { authorDisplayName, formatDate } from '@/modules/site/components/network/ui/format';
import { youtubeThumbnailFallbackUrl } from '@/modules/site/article-type';
import type { ShareButtonsSkin } from '@/modules/site/components/network/cards/share-buttons';

/** Varian hero artikel yang disepakati dari 6 mockup. */
export type ArticleHeroVariant = 'stacked' | 'breakout' | 'split' | 'overlay' | 'viewport' | 'text-first';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface ArticleHeroSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly card: string;
  readonly ring: string;
  readonly ink: string;
  readonly muted: string;
  readonly authorAvatar: AuthorAvatarSkin;
  readonly shareButtons: ShareButtonsSkin;
}

interface ArticleHeroProps {
  readonly variant: ArticleHeroVariant;
  readonly article: NetworkArticle;
  readonly siteName: string;
  readonly bylineName: string;
  readonly reading: number;
  readonly canonical: string;
  readonly skin: ArticleHeroSkin;
}

/**
 * Satu mode hero artikel untuk 10 template.
 *
 * @param variant - Salah satu dari 6 gaya mockup yang disetujui.
 * @param article - Artikel detail jaringan.
 * @param siteName - Nama portal untuk catatan editorial.
 * @param bylineName - Nama tampilan penulis.
 * @param reading - Estimasi menit baca.
 * @param canonical - URL kanonis artikel.
 * @param skin - Warna aksen dan nada dari tema template.
 * @returns Blok breadcrumb, judul, byline, dan gambar sesuai varian.
 */
export function ArticleHero({ variant, article, siteName, bylineName, reading, canonical, skin }: ArticleHeroProps) {
  switch (variant) {
    case 'breakout':
      return <BreakoutHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
    case 'split':
      return <SplitHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
    case 'overlay':
      return <OverlayHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
    case 'viewport':
      return <ViewportHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
    case 'text-first':
      return <TextFirstHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
    case 'stacked':
    default:
      return <StackedHero article={article} siteName={siteName} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />;
  }
}

function featuredSrcOf(article: NetworkArticle): string {
  return article.imageUrl ?? article.thumbnailUrl ?? '/assets/article-fallback.webp';
}

function Breadcrumb({ article, light = false }: { readonly article: NetworkArticle; readonly light?: boolean }) {
  const color = light ? 'text-white/70' : 'text-slate-600';
  const current = light ? 'text-white' : 'text-slate-900';
  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1.5 font-sans text-xs ${color}`}>
      <Link href="/" className="transition-colors hover:opacity-80">
        Beranda
      </Link>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      {article.categorySlug ? (
        <>
          <Link href={`/categories/${article.categorySlug}`} className="transition-colors hover:opacity-80">
            {article.categoryName}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </>
      ) : null}
      <span className={`min-w-0 flex-1 truncate ${current}`} aria-current="page">
        {article.title}
      </span>
    </nav>
  );
}

function CategoryEyebrow({ article, skin }: { readonly article: NetworkArticle; readonly skin: ArticleHeroSkin }) {
  if (article.categoryName === null) return null;
  return (
    <p className="m-0 mt-6 flex items-center gap-2 font-sans text-sm font-semibold" style={{ color: skin.accent }}>
      <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
      {article.categoryName}
    </p>
  );
}

function TitleBlock({
  article,
  skin,
  light = false,
}: {
  readonly article: NetworkArticle;
  readonly skin: ArticleHeroSkin;
  readonly light?: boolean;
}) {
  const titleColor = light ? '#ffffff' : skin.ink;
  const descColor = light ? 'rgba(255,255,255,0.9)' : skin.muted;
  return (
    <>
      <CategoryEyebrow article={article} skin={skin} />
      <h1
        className="m-0 mt-3 block w-full font-sans text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl"
        style={{ color: titleColor }}
      >
        {article.title}
      </h1>
      <p
        className="m-0 mt-4 block w-full border-l-[3px] pl-4 font-sans text-[19px] font-medium leading-[1.7]"
        style={{ borderColor: skin.accent, color: descColor }}
      >
        {article.description}
      </p>
    </>
  );
}

function BylineCard({
  article,
  bylineName,
  reading,
  canonical,
  skin,
  light = false,
}: {
  readonly article: NetworkArticle;
  readonly bylineName: string;
  readonly reading: number;
  readonly canonical: string;
  readonly skin: ArticleHeroSkin;
  readonly light?: boolean;
}) {
  return (
    <>
      <div
        className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl p-4 shadow-sm sm:px-5"
        style={{ backgroundColor: light ? 'rgba(255,255,255,0.12)' : skin.card, border: `1px solid ${skin.ring}` }}
      >
        <p className="m-0 flex min-w-0 items-center gap-3">
          <AuthorAvatar skin={skin.authorAvatar} name={bylineName} avatarUrl={article.publisherLogoUrl} size="md" />
          <span className="min-w-0">
            <span
              className="block truncate font-sans text-sm font-bold"
              style={{ color: light ? '#ffffff' : skin.ink }}
            >
              {bylineName}
            </span>
            <ArticleBylineMeta
              publishedAt={article.publishedAt}
              reading={reading}
              viewCount={article.viewCount}
              articleId={article.id}
              href={`/${article.slug}`}
              className={light ? 'text-white/80' : ''}
            />
          </span>
        </p>
      </div>
      <ArticleActionStrip skin={skin.shareButtons} article={article} canonical={canonical} />
    </>
  );
}

function EditorialNote({ article, siteName, skin }: { readonly article: NetworkArticle; readonly siteName: string; readonly skin: ArticleHeroSkin }) {
  return (
    <aside aria-label="Catatan editorial" className="mt-6 border-l-[3px] pl-4" style={{ borderColor: skin.accent }}>
      <p className="m-0 font-sans text-[13px] leading-relaxed" style={{ color: skin.muted }}>
        Artikel ini merupakan konten yang dibuat oleh pengguna. Seluruh isi, informasi, dan opini yang terdapat di dalamnya menjadi
        tanggung jawab {authorDisplayName(article)} dan tidak mewakili pandangan resmi redaksi {siteName}.
      </p>
    </aside>
  );
}

function HeroImage({
  article,
  figureClassName,
  captionClassName,
  aspectClassName = '',
}: {
  readonly article: NetworkArticle;
  readonly figureClassName: string;
  readonly captionClassName: string;
  readonly aspectClassName?: string;
}) {
  return (
    <EditorialImage
      src={featuredSrcOf(article)}
      thumbSrc={article.thumbnailUrl}
      alt={article.title}
      caption={article.title}
      captionClassName={captionClassName}
      fallbackSrc={youtubeThumbnailFallbackUrl(article.type === 'video' ? article.videoUrl : null)}
      width={article.imageWidth}
      height={article.imageHeight}
      focalX={article.imageFocalX}
      focalY={article.imageFocalY}
      eager
      figureClassName={`${figureClassName} ${aspectClassName}`.trim()}
    />
  );
}

function StackedHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <Breadcrumb article={article} />
      <header>
        <TitleBlock article={article} skin={skin} />
        <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />
      </header>
      <EditorialNote article={article} siteName={siteName} skin={skin} />
      <HeroImage
        article={article}
        figureClassName="m-0 mt-6 overflow-hidden rounded-2xl shadow-sm"
        captionClassName="px-6 py-3 font-sans text-xs leading-relaxed"
      />
    </>
  );
}

function BreakoutHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <Breadcrumb article={article} />
      <div className="relative left-1/2 mt-6 w-screen max-w-none -translate-x-1/2 overflow-hidden">
        <EditorialImage
          src={featuredSrcOf(article)}
          thumbSrc={article.thumbnailUrl}
          alt={article.title}
          caption={article.title}
          captionClassName="sr-only"
          fallbackSrc={youtubeThumbnailFallbackUrl(article.type === 'video' ? article.videoUrl : null)}
          width={article.imageWidth}
          height={article.imageHeight}
          focalX={article.imageFocalX}
          focalY={article.imageFocalY}
          eager
          figureClassName="m-0 aspect-[21/9] w-full"
          className="h-full w-full object-cover"
        />
      </div>
      <div
        className="relative z-10 -mt-16 rounded-2xl p-6 shadow-sm sm:p-8"
        style={{ backgroundColor: skin.card, border: `1px solid ${skin.ring}` }}
      >
        <header>
          <TitleBlock article={article} skin={skin} />
          <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />
        </header>
      </div>
      <EditorialNote article={article} siteName={siteName} skin={skin} />
    </>
  );
}

function SplitHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <Breadcrumb article={article} />
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <header>
            <TitleBlock article={article} skin={skin} />
            <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />
          </header>
          <EditorialNote article={article} siteName={siteName} skin={skin} />
        </div>
        <div className="min-w-0 lg:sticky lg:top-20">
          <HeroImage
            article={article}
            figureClassName="m-0 overflow-hidden rounded-2xl shadow-sm"
            captionClassName="px-6 py-3 font-sans text-xs leading-relaxed"
            aspectClassName="aspect-[4/3]"
          />
        </div>
      </div>
    </>
  );
}

function OverlayHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <div className="relative mt-2 min-h-[480px] overflow-hidden rounded-2xl shadow-sm md:min-h-[560px]">
        <EditorialImage
          src={featuredSrcOf(article)}
          thumbSrc={article.thumbnailUrl}
          alt={article.title}
          caption={article.title}
          captionClassName="sr-only"
          fallbackSrc={youtubeThumbnailFallbackUrl(article.type === 'video' ? article.videoUrl : null)}
          width={article.imageWidth}
          height={article.imageHeight}
          focalX={article.imageFocalX}
          focalY={article.imageFocalY}
          eager
          figureClassName="absolute inset-0 m-0"
          className="h-full w-full object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/10" />
        <div className="absolute inset-x-0 top-0 p-4 sm:p-6">
          <Breadcrumb article={article} light />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <TitleBlock article={article} skin={skin} light />
          <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} light />
        </div>
      </div>
      <EditorialNote article={article} siteName={siteName} skin={skin} />
    </>
  );
}

function ViewportHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <div className="relative left-1/2 min-h-[420px] w-screen max-w-none -translate-x-1/2 overflow-hidden" style={{ height: '70svh' }}>
        <EditorialImage
          src={featuredSrcOf(article)}
          thumbSrc={article.thumbnailUrl}
          alt={article.title}
          caption={article.title}
          captionClassName="sr-only"
          fallbackSrc={youtubeThumbnailFallbackUrl(article.type === 'video' ? article.videoUrl : null)}
          width={article.imageWidth}
          height={article.imageHeight}
          focalX={article.imageFocalX}
          focalY={article.imageFocalY}
          eager
          figureClassName="absolute inset-0 m-0"
          className="h-full w-full object-cover"
        />
        <span aria-hidden="true" className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {article.categoryName === null ? null : (
            <p className="m-0 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{article.categoryName}</p>
          )}
          <p className="m-0 mt-3 max-w-3xl font-serif text-2xl font-medium uppercase leading-snug tracking-[0.15em] text-white sm:text-3xl">
            {article.title}
          </p>
          <p className="m-0 mt-3 max-w-xl font-sans text-sm leading-relaxed text-white/80">{article.description}</p>
          <p className="m-0 mt-4 font-sans text-xs text-white/60">{formatDate(article.publishedAt, 'long')}</p>
        </div>
      </div>
      <div className="pt-6">
        <Breadcrumb article={article} />
        <header>
          <TitleBlock article={article} skin={skin} />
          <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />
        </header>
        <EditorialNote article={article} siteName={siteName} skin={skin} />
      </div>
    </>
  );
}

function TextFirstHero(props: Omit<ArticleHeroProps, 'variant'>) {
  const { article, siteName, bylineName, reading, canonical, skin } = props;
  return (
    <>
      <Breadcrumb article={article} />
      <header>
        <TitleBlock article={article} skin={skin} />
        <BylineCard article={article} bylineName={bylineName} reading={reading} canonical={canonical} skin={skin} />
      </header>
      <EditorialNote article={article} siteName={siteName} skin={skin} />
      <HeroImage
        article={article}
        figureClassName="m-0 mt-6 overflow-hidden rounded-2xl shadow-sm sm:float-right sm:mb-4 sm:ml-6 sm:mt-6 sm:w-[320px]"
        captionClassName="px-4 py-2.5 font-sans text-xs leading-relaxed"
      />
    </>
  );
}
