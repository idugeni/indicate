import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, PopularAside, StatusLine, formatDate, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function BroadsheetListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [lead, ...rest] = site.articles;
  const today = formatDate(new Date().toISOString(), 'full');

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b-4 border-double border-hairline-strong py-10 text-center md:py-12" aria-label="Masthead edisi">
        <Container>
          <p className="m-0 font-mono text-[11px] uppercase tracking-widest text-paper-faint">
            Edisi {today} · {site.articles.length} laporan
          </p>
          <h1 className="m-0 mx-auto mt-3 max-w-3xl font-serif text-4xl font-black leading-none tracking-tight text-paper sm:text-5xl">
            {title}
          </h1>
          <p className="m-0 mx-auto mt-3 max-w-xl font-serif text-sm italic leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          <div className="broadsheet-grid grid items-start gap-0 md:grid-cols-3">
            <section className="md:col-span-2 md:border-r md:border-hairline md:pr-8" aria-label={title}>
              {lead ? <ArticleCard article={lead} featured /> : null}
              <div className="mt-8 grid gap-x-8 gap-y-8 sm:grid-cols-2">
                {rest.map((article) => (
                  <ArticleCard article={article} key={article.id} />
                ))}
              </div>
            </section>
            <div className="mt-8 md:mt-0 md:pl-8">
              <PopularAside articles={site.articles} />
            </div>
          </div>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
