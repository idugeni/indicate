import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function ColumnistListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-14">
        <Container className="max-w-3xl">
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Opini & esai redaksi</p>
          <h1 className="m-0 mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-5xl">
            {title}
          </h1>
          <p className="m-0 mt-4 font-sans text-[15px] leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-8">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div className="border-t border-hairline">
              {site.articles.map((article) => (
                <ArticleCard article={article} key={article.id} variant="row" />
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
