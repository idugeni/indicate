import Link from 'next/link';
import { ChevronRight, Zap } from 'lucide-react';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, formatDate, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function TabloidExpressListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [headline, ...rest] = site.articles;
  const ticker = site.articles.slice(0, 6);

  return (
    <NetworkTemplate site={site}>
      <section className="tabloid-banner border-b border-hairline bg-[var(--site-primary)] py-10 md:py-14" aria-label="Headline kilat">
        <Container>
          <p className="m-0 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white/85">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Kilat · {formatDate(new Date().toISOString(), 'medium')}
          </p>
          <h1 className="m-0 mt-3 max-w-4xl font-sans text-3xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            {headline?.title ?? title}
          </h1>
          <p className="m-0 mt-3 max-w-2xl font-sans text-sm leading-relaxed text-white/85">
            {headline?.description ?? description ?? site.settings.description}
          </p>
          {headline ? (
            <p className="m-0 mt-5">
              <Link
                href={`/articles/${headline.slug}`}
                className="inline-flex items-center gap-1.5 rounded bg-white px-4 py-2.5 font-sans text-sm font-bold text-black transition-opacity hover:opacity-90"
              >
                Baca kilat
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          ) : null}
        </Container>
      </section>

      {ticker.length > 1 ? (
        <div className="border-b border-hairline bg-bg-raised" aria-label="Kabar kilat berikutnya">
          <Container className="no-scrollbar flex gap-6 overflow-x-auto py-2.5">
            {ticker.slice(1).map((item) => (
              <Link
                key={item.id}
                href={`/articles/${item.slug}`}
                className="flex flex-none items-center gap-2 font-mono text-xs text-paper-dim hover:text-paper"
              >
                <Zap className="h-3 w-3 flex-none text-[var(--site-accent)]" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.title}</span>
              </Link>
            ))}
          </Container>
        </div>
      ) : null}

      <Container className="py-8">
        <StatusLine count={site.articles.length} title={title} />
        {rest.length === 0 && !headline ? (
          <EmptyListing title={title} />
        ) : (
          <section className="flash-rail no-scrollbar grid auto-cols-[minmax(16rem,20rem)] grid-flow-col gap-4 overflow-x-auto pb-2 lg:grid-flow-row lg:grid-cols-3 lg:auto-cols-auto lg:overflow-visible" aria-label={title}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} variant="flash" />
            ))}
          </section>
        )}
      </Container>

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
