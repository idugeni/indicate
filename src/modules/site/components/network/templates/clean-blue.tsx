import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Bookmark, ChevronLeft, ChevronRight, Send, Share2, Tag } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import type { NetworkArticle } from '@/modules/delivery/models';
import {
  EmptyListing,
  StatusLine,
  formatDate,
  formatTime,
  getReadingTime,
  isLocalImageSrc,
  type ListingProps,
} from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';
import { ARTICLE_FALLBACK_IMAGE_URL } from '@/ui/site/marketing-content';

/** Badge kategori berwarna (disiklus per indeks) khas pola Clean Blue. */
const BADGE_STYLES = [
  { color: '#15803d', backgroundColor: '#dcfce7' },
  { color: '#6d28d9', backgroundColor: '#ede9fe' },
  { color: '#c2410c', backgroundColor: '#ffedd5' },
  { color: '#1d4ed8', backgroundColor: '#dbeafe' },
] as const;

function badgeStyle(index: number): { readonly color: string; readonly backgroundColor: string } {
  const pick = BADGE_STYLES[index % BADGE_STYLES.length] ?? BADGE_STYLES[0];
  return { color: pick.color, backgroundColor: pick.backgroundColor };
}

function articleImage(article: NetworkArticle): string {
  return article.thumbnailUrl ?? article.imageUrl ?? ARTICLE_FALLBACK_IMAGE_URL;
}

export function CleanBlueListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, ...rest] = site.articles;
  const picks = rest.slice(0, 3);
  const heroReading = hero ? getReadingTime(hero.body || hero.description || '') : 0;
  const heroAuthor = hero?.authorName ?? hero?.attribution ?? site.settings.name;

  return (
    <NetworkTemplate site={site}>
      <div className="bg-[#f5f8fd] text-slate-900">
        <Container className="space-y-8 py-6 md:py-8">
          <StatusLine count={site.articles.length} title={title} />

          {hero ? (
            <Link
              href={`/articles/${hero.slug}`}
              className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-3 shadow-sm ring-1 ring-slate-200/70 transition-shadow hover:shadow"
            >
              <span className="flex-none rounded-full bg-[#1f6feb] px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white">
                TERKINI
              </span>
              <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-slate-800">
                {hero.title}
              </span>
              <time dateTime={hero.publishedAt} className="hidden flex-none font-mono text-xs tabular-nums text-slate-500 sm:block">
                {formatTime(hero.publishedAt)} WIB
              </time>
              <span className="flex flex-none items-center gap-1.5" aria-hidden="true">
                <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200">
                  <ChevronLeft className="h-4 w-4 text-slate-500" />
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full ring-1 ring-slate-200">
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                </span>
              </span>
            </Link>
          ) : null}

          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <>
              {hero ? (
                <section className="grid items-center gap-8 lg:grid-cols-2" aria-label={title}>
                  <div className="relative overflow-hidden rounded-2xl shadow-sm">
                    <Image
                      unoptimized={!isLocalImageSrc(articleImage(hero))}
                      src={articleImage(hero)}
                      alt={hero.title}
                      priority
                      className="aspect-[16/10] w-full object-cover"
                      width={hero.imageWidth ?? 1200}
                      height={hero.imageHeight ?? 750}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 font-sans text-xs font-medium text-white backdrop-blur-sm">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      {hero.categoryName ?? 'Berita Utama'}
                    </span>
                  </div>

                  <div>
                    <p className="m-0 flex items-center gap-2 font-sans text-sm font-semibold text-[#1f6feb]">
                      <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
                      {hero.categoryName ?? 'Nasional'}
                    </p>
                    <h1 className="m-0 mt-3 font-sans text-3xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-4xl">
                      <Link href={`/articles/${hero.slug}`} className="hover:text-[#1f6feb]">
                        {hero.title}
                      </Link>
                    </h1>
                    <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-slate-600">
                      {hero.description}
                    </p>
                    <div className="mt-6 flex items-center justify-between gap-3">
                      <p className="m-0 flex min-w-0 items-center gap-3">
                        <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#1f6feb]/10 font-sans text-sm font-bold text-[#1f6feb]">
                          {heroAuthor.trim().slice(0, 1).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-sans text-sm font-bold text-slate-900">
                            {heroAuthor}
                          </span>
                          <span className="block font-sans text-xs tabular-nums text-slate-500">
                            {formatDate(hero.publishedAt, 'medium')} · {heroReading} menit baca
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
                          href={`/articles/${hero.slug}`}
                          aria-label="Bagikan artikel"
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#1f6feb]"
                        >
                          <Share2 className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </p>
                    </div>
                  </div>
                </section>
              ) : null}

              {picks.length > 0 ? (
                <section aria-label="Berita pilihan">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
                        <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#1f6feb]" />
                        Berita Pilihan
                      </h2>
                      <p className="m-0 mt-1 font-sans text-sm text-slate-500">
                        {description ?? 'Informasi terkurasi untuk Anda'}
                      </p>
                    </div>
                    <Link
                      href="/articles"
                      className="inline-flex flex-none items-center gap-1 font-sans text-sm font-semibold text-[#1f6feb] hover:underline"
                    >
                      Lihat Semua
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-3">
                    {picks.map((article, index) => {
                      const reading = getReadingTime(article.body || article.description || '');
                      const badge = badgeStyle(index);
                      return (
                        <article key={article.id} className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
                          <div className="px-3 pt-3">
                            <div className="overflow-hidden rounded-xl">
                              <Image
                                unoptimized={!isLocalImageSrc(articleImage(article))}
                                src={articleImage(article)}
                                alt={article.title}
                                loading="lazy"
                                className="aspect-[16/10] w-full object-cover"
                                width={article.imageWidth ?? 800}
                                height={article.imageHeight ?? 500}
                                sizes="(max-width: 768px) 100vw, 33vw"
                              />
                            </div>
                          </div>
                          <div className="flex flex-1 flex-col px-5 pb-5">
                            <p className="m-0 -mt-9 mb-3">
                              <span
                                className="inline-block rounded-lg px-2.5 py-1 font-sans text-xs font-bold"
                                style={badge}
                              >
                                {article.categoryName ?? 'Berita'}
                              </span>
                            </p>
                            <h3 className="m-0 font-sans text-[17px] font-bold leading-snug tracking-tight text-slate-900">
                              <Link href={`/articles/${article.slug}`} className="hover:text-[#1f6feb]">
                                {article.title}
                              </Link>
                            </h3>
                            <p className="m-0 mt-2 line-clamp-3 font-sans text-sm leading-relaxed text-slate-600">
                              {article.description}
                            </p>
                            <p className="m-0 mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <span className="font-sans text-xs tabular-nums text-slate-500">
                                {formatDate(article.publishedAt, 'medium')} · {reading} menit baca
                              </span>
                              <Link
                                href={`/articles/${article.slug}`}
                                aria-label={`Baca: ${article.title}`}
                                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#e8f0fe] text-[#1f6feb] transition-colors hover:bg-[#1f6feb] hover:text-white"
                              >
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                              </Link>
                            </p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section aria-label="Berlangganan newsletter" className="relative overflow-hidden rounded-2xl bg-[#e8f0fe] px-6 py-8 md:px-10">
                <div className="max-w-xl">
                  <h2 className="m-0 font-sans text-2xl font-extrabold leading-tight tracking-tight text-slate-900">
                    Dapatkan Berita Terbaru Langsung ke Email Anda
                  </h2>
                  <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-slate-600">
                    Berlangganan newsletter kami dan jangan lewatkan informasi penting setiap hari.
                  </p>
                  <p className="m-0 mt-5 flex flex-col gap-2.5 sm:flex-row">
                    <label htmlFor="clean-blue-newsletter-email" className="sr-only">
                      Alamat email
                    </label>
                    <input
                      id="clean-blue-newsletter-email"
                      type="email"
                      required
                      placeholder="Masukkan alamat email"
                      className="h-11 w-full flex-1 rounded-full border border-slate-200 bg-white px-4 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1f6feb] focus:outline-none"
                    />
                    <Link
                      href="/contact"
                      className="inline-flex h-11 flex-none items-center justify-center rounded-full bg-[#1f6feb] px-6 font-sans text-sm font-bold text-white transition-colors hover:bg-[#1a5fd0]"
                    >
                      Berlangganan
                    </Link>
                  </p>
                  <p className="m-0 mt-2.5 font-sans text-xs text-slate-500">
                    Kami menghargai privasi Anda. Tidak ada spam, hanya berita penting.
                  </p>
                </div>
                <Send aria-hidden="true" className="pointer-events-none absolute -right-4 bottom-6 hidden h-28 w-28 rotate-12 text-[#1f6feb]/25 md:block" />
              </section>
            </>
          )}
        </Container>
      </div>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
