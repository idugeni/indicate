import { MapPin } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import type { NetworkArticle } from '@/modules/delivery/models';
import { ArticleCard, EmptyListing, StatusLine, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function GeoRadarListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const groups = new Map<string, NetworkArticle[]>();
  for (const article of site.articles) {
    const key = article.categoryName ?? 'Warta wilayah';
    const bucket = groups.get(key);
    if (bucket) bucket.push(article);
    else groups.set(key, [article]);
  }
  const groupEntries = [...groups.entries()].slice(0, 6);

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-10 md:py-12" aria-label="Radar wilayah">
        <Container>
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Radar wilayah
          </p>
          <h1 className="m-0 mt-3 max-w-3xl font-serif text-3xl font-bold leading-tight tracking-tight text-paper sm:text-4xl">
            {title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded border border-hairline bg-hairline sm:grid-cols-3" role="list" aria-label="Kanal wilayah terpantau">
            {groupEntries.map(([name, items]) => (
              <div key={name} role="listitem" className="flex items-center gap-2.5 bg-bg-raised p-3">
                <span className="h-2 w-2 flex-none rounded-full bg-[var(--signal,#5FCBB0)]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="m-0 truncate font-sans text-[13px] font-semibold text-paper">{name}</p>
                  <p className="m-0 font-mono text-[11px] tabular-nums text-paper-faint">{items.length} laporan</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Container className="space-y-10 py-8">
        <StatusLine count={site.articles.length} title={title} />
        {site.articles.length === 0 ? (
          <EmptyListing title={title} />
        ) : (
          groupEntries.map(([name, items]) => (
            <section key={name} aria-label={`Wilayah ${name}`}>
              <h2 className="m-0 flex items-center gap-2 border-b border-hairline pb-2 font-mono text-xs font-bold uppercase tracking-wider text-paper">
                <MapPin className="h-3.5 w-3.5 text-[var(--site-accent)]" aria-hidden="true" />
                {name}
                <span className="font-normal tabular-nums text-paper-faint">· {items.length}</span>
              </h2>
              <div className="mt-5 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {items.slice(0, 6).map((article) => (
                  <ArticleCard article={article} key={article.id} />
                ))}
              </div>
            </section>
          ))
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
