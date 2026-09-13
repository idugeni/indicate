import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, ChannelAside, EmptyListing, StatusLine, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function PortalNewsListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const featuredArticle = site.articles[0];
  const regularArticles = site.articles.slice(1);

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-12">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Warta & laporan berkala</p>
          <h1 className="m-0 mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        <div className="listing-grid grid items-start gap-10 md:grid-cols-[minmax(0,1fr)_16rem]">
          <section className="space-y-10" aria-label={title}>
            {site.articles.length === 0 ? (
              <EmptyListing title={title} />
            ) : (
              <>
                {featuredArticle ? <ArticleCard article={featuredArticle} featured /> : null}
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
                  {regularArticles.map((article) => (
                    <ArticleCard article={article} key={article.id} />
                  ))}
                </div>
              </>
            )}
          </section>

          <ChannelAside site={site} />
        </div>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
