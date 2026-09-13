import Link from 'next/link';
import { FileText } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { EmptyListing, StatusLine, formatDate, getReadingTime, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function MinimalPressListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10">
        <Container className="max-w-3xl">
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            Siaran pers resmi
          </p>
          <h1 className="m-0 mt-2 font-sans text-2xl font-bold leading-tight tracking-tight text-paper sm:text-3xl">
            {title}
          </h1>
          <p className="m-0 mt-2 font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      <Container className="max-w-3xl py-6">
        <StatusLine count={site.articles.length} title={title} />
        <section aria-label={title}>
          {site.articles.length === 0 ? (
            <EmptyListing title={title} />
          ) : (
            <div className="border-t border-hairline">
              {site.articles.map((article) => (
                <article key={article.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 border-b border-hairline py-4">
                  <div className="w-24 flex-none">
                    <p className="m-0 font-mono text-[11px] tabular-nums leading-relaxed text-paper-faint">
                      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt, 'medium')}</time>
                    </p>
                    <p className="m-0 mt-1 font-mono text-[11px] tabular-nums text-paper-faint">
                      {getReadingTime(article.body || article.description || '')} mnt
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="m-0">
                      <span className="inline-block rounded-sm border border-hairline bg-bg-raised-2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-paper-dim">
                        {article.categoryName ?? 'Siaran pers'}
                      </span>
                    </p>
                    <h2 className="m-0 mt-1.5 font-sans text-base font-semibold leading-snug text-paper">
                      <Link
                        href={`/articles/${article.slug}`}
                        className="rounded-sm decoration-[var(--site-accent)] decoration-2 underline-offset-4 hover:underline"
                      >
                        {article.title}
                      </Link>
                    </h2>
                    <p className="m-0 mt-1 line-clamp-2 font-sans text-[13px] leading-relaxed text-paper-dim">
                      {article.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
