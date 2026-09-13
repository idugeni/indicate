import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, formatCompactViews, formatDate, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function MultimediaVisualListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const gallery = site.articles.filter((a) => a.imageUrl !== null).slice(0, 8);
  const rest = site.articles.filter((a) => !gallery.some((g) => g.id === a.id));

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10" aria-label="Galeri visual">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Galeri & dokumenter visual</p>
          <h1 className="m-0 mt-2 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
        {gallery.length > 0 ? (
          <div className="gallery-rail no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2" role="list" aria-label="Sorotan foto">
            {gallery.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                role="listitem"
                className="group w-[78vw] max-w-md flex-none snap-start sm:w-[46vw] lg:w-[30vw]"
              >
                <span className="media-frame block aspect-video overflow-hidden rounded bg-bg-raised-2">
                  <Image
                    unoptimized
                    src={article.imageUrl!}
                    alt={article.title}
                    loading={gallery.indexOf(article) < 2 ? undefined : 'lazy'}
                    priority={gallery.indexOf(article) < 2}
                    className="h-full w-full object-cover"
                    width={article.imageWidth ?? 1200}
                    height={article.imageHeight ?? 675}
                    sizes="(max-width: 640px) 78vw, 30vw"
                  />
                </span>
                <span className="mt-2 block truncate font-sans text-sm font-semibold text-paper group-hover:text-[var(--site-accent)]">
                  {article.title}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-paper-faint">
                  {formatDate(article.publishedAt, 'medium')} · {formatCompactViews(article.viewCount)} tontonan
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : rest.length > 0 ? (
          <section className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${title} — arsip`}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} variant="visual" />
            ))}
          </section>
        ) : null}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
