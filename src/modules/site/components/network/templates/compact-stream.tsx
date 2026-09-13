import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, formatTime, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function CompactStreamListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const latest = site.articles[0];

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-6 md:py-8" aria-label="Status liputan langsung">
        <Container className="max-w-3xl">
          <p className="m-0 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-[var(--site-accent)]">
            <span className="live-dot h-2 w-2 flex-none rounded-full bg-[var(--signal,#5FCBB0)]" aria-hidden="true" />
            Liputan langsung
          </p>
          <h1 className="m-0 mt-2 font-sans text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
            {title}
          </h1>
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-paper-faint">
            {latest ? `Pembaruan terakhir ${formatTime(latest.publishedAt)} WIB · ` : null}
            {site.articles.length} pembaruan · {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-6">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div>
              {site.articles.map((article) => (
                <ArticleCard article={article} key={article.id} variant="timeline" />
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
