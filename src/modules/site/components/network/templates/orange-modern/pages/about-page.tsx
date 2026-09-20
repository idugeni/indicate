import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { buildSeoDocument } from '@/modules/site/seo';
import { resolvePublisherChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { ABOUT_TRUST_LINKS, deriveAboutCategories, deriveAboutPublisher } from '@/modules/site/about-profile';
import type { NetworkSiteData } from '@/modules/delivery/models';
import { OrangeModernShell } from '@/modules/site/components/network/templates/orange-modern/chrome/shell';
import { OrangeModernContainer } from '@/modules/site/components/network/templates/orange-modern/ui/container';
import { OrangeModernJsonLd } from '@/modules/site/components/network/templates/orange-modern/seo/json-ld';

export interface OrangeModernAboutProps {
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
export function OrangeModernAbout({ site, title, description, path = '/' }: OrangeModernAboutProps) {
  const seo = buildSeoDocument(site, { path });
  const categories = deriveAboutCategories(site);
  const publisher = deriveAboutPublisher(site);
  const publisherChannels = publisher === null ? [] : resolvePublisherChannels(publisher.socials);
  return (
    <OrangeModernShell site={site} path={path}>
      <OrangeModernContainer className="space-y-6 py-6 md:py-8">
        <div>
          <h1 className="m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed text-slate-600">
              {description}
            </p>
          )}
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums text-slate-400">
            {site.articles.length} artikel · {categories.length} kanal · {site.context.normalizedHostname}
            {site.regionName === null ? null : ` · Cakupan ${site.regionName}`}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-slate-900">{site.articles.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-slate-600">Artikel terbit di kanal ini</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <p className="m-0 font-mono text-2xl font-bold tabular-nums text-slate-900">{categories.length}</p>
            <p className="m-0 mt-1 font-sans text-sm text-slate-600">Kanal liputan aktif</p>
          </div>
        </div>
        {publisher === null ? null : (
          <section aria-label="Penerbit">
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
              Penerbit
            </h2>
            <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-[#ea580c]/10 font-sans text-xl font-bold text-[#ea580c]">
                  {publisher.name.trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="m-0 flex min-w-0 items-center gap-1.5 font-sans text-base font-bold text-slate-900">
                    <span className="truncate">{publisher.name}</span>
                    {publisher.verified ? <BadgeCheck className="h-4 w-4 flex-none text-[#ea580c]" aria-label="Penerbit terverifikasi" /> : null}
                  </p>
                  <p className="m-0 mt-0.5 truncate font-sans text-xs text-slate-600">
                    Penerbit{publisher.city === null ? '' : ` · ${publisher.city}`} · {publisher.articleCount} artikel
                  </p>
                </div>
              </div>
              {publisher.bio === null ? null : (
                <p className="m-0 mt-3 font-sans text-sm leading-relaxed text-slate-600">{publisher.bio}</p>
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
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 ring-1 ring-slate-200 transition-colors hover:text-[#ea580c]"
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
            <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
              <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
              Jelajahi per kanal
            </h2>
            <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
              {categories.map((category) => (
                <li key={category.slug} className="m-0">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#ea580c] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#ea580c] hover:text-white"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section aria-label="Kepercayaan dan kebijakan">
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight text-slate-900">
            <span aria-hidden="true" className="h-1 w-8 rounded-full bg-[#ea580c]" />
            Kepercayaan & kebijakan
          </h2>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {ABOUT_TRUST_LINKS.map((link) => (
              <li key={link.href} className="m-0">
                <Link
                  href={link.href}
                  className="inline-block rounded-full bg-white px-4 py-2 font-sans text-sm font-semibold text-[#ea580c] shadow-sm ring-1 ring-slate-200/60 transition-colors hover:bg-[#ea580c] hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </OrangeModernContainer>
      <OrangeModernJsonLd schemas={seo.jsonLd} />
    </OrangeModernShell>
  );
}
