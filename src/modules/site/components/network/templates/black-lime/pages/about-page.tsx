import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { buildSeoDocument } from '@/modules/site/seo';
import { resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { ABOUT_TRUST_LINKS, deriveAboutCategories, deriveAboutPublisher } from '@/modules/site/about-profile';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { BlackLimeShell } from '@/modules/site/components/network/templates/black-lime/chrome/shell';
import { BlackLimeContainer } from '@/modules/site/components/network/templates/black-lime/ui/container';
import { BlackLimeJsonLd } from '@/modules/site/components/network/templates/black-lime/seo/json-ld';

export interface BlackLimeAboutProps {
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly path?: string | undefined;
}

/**
 * Profil portal tenant dari data situsnya sendiri: nama, deskripsi,
 * identitas penerbit dominan, statistik terbitan, kanal kategori,
 * dan hub kepercayaan — tanpa copy marketing pusat.
 */
export function BlackLimeAbout({ site, title, description, path = '/' }: BlackLimeAboutProps) {
  const seo = buildSeoDocument(site, { path });
  const categories = deriveAboutCategories(site);
  const publisher = deriveAboutPublisher(site);
  const publisherChannels = publisher === null ? [] : resolvePublisherChannels(publisher.socials);
  return (
    <BlackLimeShell site={site} path={path}>
      <BlackLimeContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-[#f2f5e9]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-[#a3ad9a]">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-[#646b5e]">
            {site.articles.length} artikel · {categories.length} kanal · {site.context.normalizedHostname}
            {site.regionName === null ? null : ` · Cakupan ${site.regionName}`}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-[#f2f5e9]">{site.articles.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-[#a3ad9a]">Artikel terbit di kanal ini</p>
          </div>
          <div className="rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-[#f2f5e9]">{categories.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-[#a3ad9a]">Kanal liputan aktif</p>
          </div>
        </div>
        {publisher === null ? null : (
          <section aria-label="Penerbit">
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[#f2f5e9]">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
              Penerbit
            </h2>
            <div className="mt-4 rounded-2xl bg-[#131711] p-5 shadow-sm ring-1 ring-[#242b1f]/60">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#c5f82a]/10 font-sans text-xl font-bold text-[#c5f82a]">
                  {publisher.name.trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="m-0 flex min-w-0 items-center gap-1.5 font-sans text-base font-bold text-[#f2f5e9]">
                    <span className="truncate">{publisher.name}</span>
                    {publisher.verified ? <BadgeCheck className="h-4 w-4 flex-none text-[#c5f82a]" aria-label="Penerbit terverifikasi" /> : null}
                  </p>
                  <p className="m-0 mt-0.5 truncate font-sans text-xs text-[#a3ad9a]">
                    Penerbit{publisher.city === null ? '' : ` · ${publisher.city}`} · {publisher.articleCount} artikel
                  </p>
                </div>
              </div>
              {publisher.bio === null ? null : (
                <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-[#a3ad9a]">{publisher.bio}</p>
              )}
              {publisherChannels.length === 0 ? null : (
                <p className="m-0 mt-4 flex flex-wrap items-center gap-2">
                  {publisherChannels.map((channel) => {
                    const Icon = channelIcon(channel.key);
                    return (
                      <a
                        key={channel.key}
                        href={channel.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${publisher.name} di ${channel.label}`}
                        title={channel.label}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#a3ad9a] ring-1 ring-[#242b1f] transition-colors hover:text-[#c5f82a]"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    );
                  })}
                </p>
              )}
            </div>
          </section>
        )}
        {categories.length === 0 ? null : (
          <section aria-label="Kanal liputan">
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[#f2f5e9]">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
              Jelajahi per kanal
            </h2>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
              {categories.map((category) => (
                <li key={category.slug} className="m-0">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="inline-block rounded-full bg-[#131711] px-4 py-2 font-sans text-sm font-semibold text-[#c5f82a] shadow-sm ring-1 ring-[#242b1f]/60 transition-colors hover:bg-[#c5f82a] hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="Kepercayaan dan kebijakan">
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-[#f2f5e9]">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#c5f82a]" />
            Kepercayaan & kebijakan
          </h2>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {ABOUT_TRUST_LINKS.map((link) => (
              <li key={link.href} className="m-0">
                <Link
                  href={link.href}
                  className="inline-block rounded-full bg-[#131711] px-4 py-2 font-sans text-sm font-semibold text-[#c5f82a] shadow-sm ring-1 ring-[#242b1f]/60 transition-colors hover:bg-[#c5f82a] hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </BlackLimeContainer>
      <BlackLimeJsonLd schemas={seo.jsonLd} />
    </BlackLimeShell>
  );
}
