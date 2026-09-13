import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, formatDate, isLocalImageSrc, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';
import { ARTICLE_FALLBACK_IMAGE_URL } from '@/ui/site/marketing-content';

export function EditorialMagazineListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [cover, second, ...rest] = site.articles;
  const coverSrc = cover?.imageUrl ?? ARTICLE_FALLBACK_IMAGE_URL;

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-14" aria-label="Sampul edisi">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Majalah · {formatDate(new Date().toISOString(), 'medium')}</p>
          {cover ? (
            <div className="media-frame mt-5 aspect-[21/9] overflow-hidden rounded bg-bg-raised-2">
              <Image
                unoptimized={!isLocalImageSrc(coverSrc)}
                src={coverSrc}
                alt={cover.title}
                priority
                className="h-full w-full object-cover"
                width={cover.imageWidth ?? 1600}
                height={cover.imageHeight ?? 686}
                sizes="100vw"
              />
            </div>
          ) : null}
          <h1 className="m-0 mt-6 max-w-4xl font-serif text-4xl font-black leading-[1.02] tracking-tight text-paper sm:text-6xl">
            {cover?.title ?? title}
          </h1>
          <p className="m-0 mt-4 max-w-2xl font-serif text-lg italic leading-relaxed text-paper-dim">
            {cover?.description ?? description ?? site.settings.description}
          </p>
          {cover ? (
            <p className="m-0 mt-4">
              <Link
                href={`/articles/${cover.slug}`}
                className="inline-flex items-center gap-1.5 rounded bg-[var(--site-primary)] px-4 py-2.5 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Baca laporan sampul
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          <div className="listing-grid grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <section className="grid gap-x-6 gap-y-10 sm:grid-cols-2" aria-label={title}>
              {second ? <ArticleCard article={second} key={second.id} /> : null}
              {rest.map((article) => (
                <ArticleCard article={article} key={article.id} />
              ))}
            </section>
            <aside className="listing-aside space-y-5 rounded border border-hairline bg-bg-raised p-5" aria-label="Suara redaksi">
              <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
                Suara redaksi
              </h2>
              <div className="space-y-4">
                {site.articles.slice(0, 4).map((item) => (
                  <div key={item.id} className="border-b border-hairline pb-4 last:border-0 last:pb-0">
                    <p className="m-0 font-serif text-base italic leading-snug text-paper">
                      <Link href={`/articles/${item.slug}`} className="hover:text-[var(--site-accent)]">
                        {item.title}
                      </Link>
                    </p>
                    <p className="m-0 mt-1 font-sans text-xs text-paper-faint">
                      {item.authorName ?? item.attribution} · {formatDate(item.publishedAt, 'medium')}
                    </p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
