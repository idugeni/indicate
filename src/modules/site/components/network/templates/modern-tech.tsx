import Image from 'next/image';
import Link from 'next/link';

import { Container } from '@/modules/site/components/layout/content';
import { buildSeoDocument } from '@/modules/site/seo';
import { JsonLd } from '@/modules/site/components/network/json-ld';
import { ArticleCard, EmptyListing, StatusLine, type ListingProps } from '@/modules/site/components/network/templates/listing-shared';
import { NetworkTemplate } from '@/modules/site/components/network/templates/network-template';

export function ModernTechListing({ site, title, description, path, indexable }: ListingProps) {
  const seo = buildSeoDocument(site, { path: path ?? '/', indexable: indexable ?? true });
  const [hero, sideA, sideB, ...rest] = site.articles;

  return (
    <NetworkTemplate site={site}>
      <section className="listing-hero border-b border-hairline py-8 md:py-10" aria-label="Sorotan teknologi">
        <Container>
          <p className="m-0 font-mono text-xs font-medium uppercase tracking-wider text-[var(--site-accent)]">Grid teknologi · {site.articles.length} artikel</p>
          <h1 className="sr-only">{title}</h1>
          {site.articles.length === 0 ? (
            <div className="mt-4"><EmptyListing title={title} /></div>
          ) : (
            <div className="bento-grid mt-5 grid items-stretch gap-4 lg:grid-cols-12">
              {hero ? (
                <article className="network-card bento-hero group grid overflow-hidden sm:grid-cols-2 lg:col-span-7">
                  {hero.imageUrl ? (
                    <div className="media-frame min-h-52 overflow-hidden bg-bg-raised-2">
                      <Image
                        unoptimized
                        src={hero.imageUrl}
                        alt={hero.title}
                        priority
                        className="h-full w-full object-cover"
                        width={hero.imageWidth ?? 1200}
                        height={hero.imageHeight ?? 675}
                        sizes="(max-width: 1024px) 100vw, 55vw"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-col justify-center p-6">
                    <p className="m-0">
                      <span className="inline-block bg-[var(--site-primary)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                        {hero.categoryName ?? 'Sorotan'}
                      </span>
                    </p>
                    <h2 className="m-0 mt-3 font-sans text-2xl font-bold leading-tight tracking-tight text-paper">
                      <Link href={`/articles/${hero.slug}`} className="hover:text-[var(--site-accent)]">
                        {hero.title}
                      </Link>
                    </h2>
                    <p className="m-0 mt-2 line-clamp-3 font-sans text-sm leading-relaxed text-paper-dim">
                      {hero.description}
                    </p>
                  </div>
                </article>
              ) : null}
              <div className="grid gap-4 lg:col-span-5">
                {sideA ? <ArticleCard article={sideA} key={sideA.id} variant="flash" /> : null}
                {sideB ? <ArticleCard article={sideB} key={sideB.id} variant="flash" /> : null}
              </div>
            </div>
          )}
          <p className="m-0 mt-4 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
            {description ?? site.settings.description}
          </p>
        </Container>
      </section>

      {rest.length > 0 ? (
        <Container className="py-8">
          <StatusLine count={site.articles.length} title={title} />
          <section className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-label={`${title} — arsip`}>
            {rest.map((article) => (
              <ArticleCard article={article} key={article.id} />
            ))}
          </section>
        </Container>
      ) : null}

      <JsonLd schemas={seo.jsonLd} />
    </NetworkTemplate>
  );
}
