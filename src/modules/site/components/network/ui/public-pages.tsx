import Link from 'next/link';
import { createElement, type ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { ABOUT_TRUST_LINKS, deriveAboutCategories } from '@/modules/site/about-profile';
import {
  COMPANY_NAME,
  channelAction,
  channelHandle,
  isPrimaryContact,
  resolveContactChannels,
  type ContactChannel,
} from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';

/** Varian halaman publik: klasik, editorial, atau minimal. */
export type PublicPageVariant = 'classic' | 'editorial' | 'minimal';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface PublicPageSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly card: string;
  readonly ring: string;
  readonly ink: string;
  readonly muted: string;
}

function SectionTitle({
  title,
  skin,
  serif = false,
}: {
  readonly title: string;
  readonly skin: PublicPageSkin;
  readonly serif?: boolean;
}) {
  return (
    <h1
      className={`m-0 flex items-center gap-2.5 font-sans text-2xl font-extrabold tracking-tight ${serif ? 'font-serif' : ''}`}
      style={{ color: skin.ink }}
    >
      <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
      {title}
    </h1>
  );
}

function AccentButton({ href, accent, children }: { readonly href: string; readonly accent: string; readonly children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center rounded-full px-6 font-sans text-sm font-bold text-white transition-opacity hover:opacity-85"
      style={{ backgroundColor: accent }}
    >
      {children}
    </Link>
  );
}

/**
 * Isi halaman tentang: identitas, statistik, kanal, dan tautan kepercayaan.
 *
 * @param variant - Gaya klasik, editorial, atau minimal.
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param skin - Warna tema template.
 * @returns Konten tentang tanpa shell.
 */
export function AboutSection({
  variant,
  site,
  title,
  description,
  skin,
}: {
  readonly variant: PublicPageVariant;
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly skin: PublicPageSkin;
}) {
  const categories = deriveAboutCategories(site);
  const statsLine = `${site.articles.length} artikel · ${categories.length} kanal · ${site.context.normalizedHostname}${site.regionName === null ? '' : ` · Cakupan ${site.regionName}`}`;
  if (variant === 'editorial') {
    return (
      <div>
        <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
          Tentang kami
        </p>
        <h1 className="m-0 mt-2 max-w-3xl font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: skin.ink }}>
          {title}
        </h1>
        {description === undefined || description === '' ? null : (
          <p className="m-0 mt-3 max-w-2xl font-sans text-[15px] leading-relaxed" style={{ color: skin.muted }}>
            {description}
          </p>
        )}
        <dl className="m-0 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: String(site.articles.length), label: 'Artikel terbit' },
            { value: String(categories.length), label: 'Kanal liputan' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}>
              <dd className="m-0 font-mono text-4xl font-bold tabular-nums" style={{ color: skin.ink }}>
                {stat.value}
              </dd>
              <dt className="m-0 mt-1 font-sans text-sm" style={{ color: skin.muted }}>
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
        <p className="m-0 mt-4 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          {statsLine}
        </p>
        {categories.length === 0 ? null : (
          <section aria-label="Kanal liputan" className="mt-10">
            <h2 className="m-0 font-sans text-xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
              Jelajahi per kanal
            </h2>
            <ol className="m-0 mt-2 list-none p-0">
              {categories.map((category, position) => (
                <li key={category.slug} className="m-0 p-0" style={{ borderBottom: `1px solid ${skin.ring}` }}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group flex items-center gap-4 py-3.5 transition-opacity hover:opacity-75"
                  >
                    <span className="w-8 flex-none font-mono text-sm font-bold tabular-nums" style={{ color: skin.accent }}>
                      {String(position + 1).padStart(2, '0')}
                    </span>
                    <span className="flex-1 font-sans text-lg font-bold" style={{ color: skin.ink }}>
                      {category.name}
                    </span>
                    <span aria-hidden="true" className="font-sans text-lg" style={{ color: skin.muted }}>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
        <TrustLinks skin={skin} />
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <SectionTitle title={title} skin={skin} />
        <div className="flex justify-center">
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-3 max-w-xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
              {description}
            </p>
          )}
        </div>
        <p className="m-0 mt-4 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          {statsLine}
        </p>
        <dl className="m-0 mx-auto mt-6 grid max-w-md grid-cols-2 gap-4">
          {[
            { value: String(site.articles.length), label: 'Artikel' },
            { value: String(categories.length), label: 'Kanal' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}>
              <dd className="m-0 font-mono text-2xl font-bold tabular-nums" style={{ color: skin.ink }}>
                {stat.value}
              </dd>
              <dt className="m-0 mt-1 font-sans text-sm" style={{ color: skin.muted }}>
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
        {categories.length === 0 ? null : (
          <ul className="m-0 mt-6 flex list-none flex-wrap justify-center gap-2 p-0">
            {categories.map((category) => (
              <li key={category.slug} className="m-0">
                <ChannelPill slug={category.slug} name={category.name} skin={skin} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex justify-center">
          <TrustLinks skin={skin} centered />
        </div>
      </div>
    );
  }
  return (
    <div>
      <div>
        <SectionTitle title={title} skin={skin} />
        {description === undefined || description === '' ? null : (
          <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
            {description}
          </p>
        )}
        <p className="m-0 mt-2 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          {statsLine}
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}>
          <p className="m-0 font-mono text-2xl font-bold tabular-nums" style={{ color: skin.ink }}>{site.articles.length}</p>
          <p className="m-0 mt-1 font-sans text-sm" style={{ color: skin.muted }}>Artikel terbit di kanal ini</p>
        </div>
        <div className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}>
          <p className="m-0 font-mono text-2xl font-bold tabular-nums" style={{ color: skin.ink }}>{categories.length}</p>
          <p className="m-0 mt-1 font-sans text-sm" style={{ color: skin.muted }}>Kanal liputan aktif</p>
        </div>
      </div>
      {categories.length === 0 ? null : (
        <section aria-label="Kanal liputan" className="mt-6">
          <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
            <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
            Jelajahi per kanal
          </h2>
          <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
            {categories.map((category) => (
              <li key={category.slug} className="m-0">
                <ChannelPill slug={category.slug} name={category.name} skin={skin} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="Kepercayaan dan kebijakan" className="mt-6">
        <h2 className="m-0 flex items-center gap-2.5 font-sans text-xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
          <span aria-hidden="true" className="h-1 w-8 rounded-full" style={{ backgroundColor: skin.accent }} />
          Kepercayaan & kebijakan
        </h2>
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
          {ABOUT_TRUST_LINKS.map((link) => (
            <li key={link.href} className="m-0">
              <ChannelPill href={link.href} name={link.label} skin={skin} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ChannelPill({
  slug,
  href,
  name,
  skin,
}: {
  readonly slug?: string;
  readonly href?: string;
  readonly name: string;
  readonly skin: PublicPageSkin;
}) {
  return (
    <Link
      href={href ?? `/categories/${slug ?? ''}`}
      className="inline-block rounded-full px-4 py-2 font-sans text-sm font-semibold shadow-sm transition-opacity hover:opacity-80"
      style={{ backgroundColor: skin.card, color: skin.accent, outline: `1px solid ${skin.ring}` }}
    >
      {name}
    </Link>
  );
}

function TrustLinks({ skin, centered = false }: { readonly skin: PublicPageSkin; readonly centered?: boolean }) {
  return (
    <section aria-label="Kepercayaan dan kebijakan" className="mt-10">
      <h2 className="m-0 font-sans text-xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
        Kepercayaan & kebijakan
      </h2>
      <ul className={`m-0 mt-4 flex list-none flex-wrap gap-2 p-0 ${centered ? 'justify-center' : ''}`}>
        {ABOUT_TRUST_LINKS.map((link) => (
          <li key={link.href} className="m-0">
            <ChannelPill href={link.href} name={link.label} skin={skin} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Isi halaman kontak: saluran resmi tenant dengan status kosong.
 *
 * @param variant - Gaya klasik, editorial, atau minimal.
 * @param site - Data situs tenant aktif.
 * @param title - Judul halaman.
 * @param description - Deskripsi halaman.
 * @param skin - Warna tema template.
 * @param empty - Status kosong milik template saat tanpa kanal.
 * @returns Konten kontak tanpa shell.
 */
export function ContactSection({
  variant,
  site,
  title,
  description,
  skin,
  empty,
}: {
  readonly variant: PublicPageVariant;
  readonly site: NetworkSiteData;
  readonly title: string;
  readonly description?: string | undefined;
  readonly skin: PublicPageSkin;
  readonly empty: ReactNode;
}) {
  const channels = resolveContactChannels(site.settings.socialLinks);
  const primary = channels.filter((channel) => isPrimaryContact(channel.key));
  const socials = channels.filter((channel) => !isPrimaryContact(channel.key));
  const statsLine = `${channels.length} kanal · ${COMPANY_NAME} · ${site.context.normalizedHostname}`;
  if (channels.length === 0) return <>{empty}</>;
  if (variant === 'editorial') {
    return (
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="min-w-0 lg:sticky lg:top-20">
          <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
            Hubungi kami
          </p>
          <h1 className="m-0 mt-2 font-serif text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: skin.ink }}>
            {title}
          </h1>
          {description === undefined || description === '' ? null : (
            <p className="m-0 mt-3 max-w-md font-sans text-[15px] leading-relaxed" style={{ color: skin.muted }}>
              {description}
            </p>
          )}
          <p className="m-0 mt-3 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
            {statsLine}
          </p>
        </div>
        <ol className="m-0 list-none p-0">
          {channels.map((channel) => (
            <ChannelRow key={channel.key} channel={channel} skin={skin} />
          ))}
        </ol>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <SectionTitle title={title} skin={skin} />
          <div className="flex justify-center">
            {description === undefined || description === '' ? null : (
              <p className="m-0 mt-2 max-w-xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
                {description}
              </p>
            )}
          </div>
          <p className="m-0 mt-2 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
            {statsLine}
          </p>
        </div>
        <ul className="m-0 mt-6 grid list-none gap-2.5 p-0 sm:grid-cols-2">
          {channels.map((channel) => (
            <ChannelCard key={channel.key} channel={channel} skin={skin} compact />
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div>
      <div>
        <SectionTitle title={title} skin={skin} />
        {description === undefined || description === '' ? null : (
          <p className="m-0 mt-1 max-w-2xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
            {description}
          </p>
        )}
        <p className="m-0 mt-2 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          {statsLine}
        </p>
      </div>
      <div className="mt-6 grid gap-4">
        <ul className="m-0 grid list-none gap-2.5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {primary.map((channel) => (
            <ChannelCard key={channel.key} channel={channel} skin={skin} action />
          ))}
        </ul>
        {socials.length === 0 ? null : (
          <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 lg:grid-cols-4">
            {socials.map((channel) => (
              <ChannelCard key={channel.key} channel={channel} skin={skin} compact />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ChannelGlyph({ channelKey, className }: { readonly channelKey: string; readonly className: string }) {
  return (
    <span aria-hidden="true" className="contents">
      {createElement(channelIcon(channelKey), { className })}
    </span>
  );
}

function ChannelCard({
  channel,
  skin,
  compact = false,
  action = false,
}: {
  readonly channel: ContactChannel;
  readonly skin: PublicPageSkin;
  readonly compact?: boolean;
  readonly action?: boolean;
}) {
  const external = channel.href.startsWith('http');
  return (
    <li className="m-0">
      <a
        href={channel.href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={`flex h-full items-center gap-2.5 rounded-2xl shadow-sm transition-opacity hover:opacity-80 ${compact ? 'p-3' : 'p-3.5'}`}
        style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}
      >
        <span
          className={`flex flex-none items-center justify-center rounded-full ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}
          style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
        >
          <ChannelGlyph channelKey={channel.key} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-sm font-bold" style={{ color: skin.ink }}>
            {channel.label}
          </span>
          <span className={`block truncate font-sans ${compact ? 'text-[11px]' : 'text-xs'}`} style={{ color: skin.muted }}>
            {channelHandle(channel)}
          </span>
        </span>
        {action ? (
          <span
            className="flex-none rounded-full px-3 py-1.5 font-sans text-xs font-bold"
            style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
          >
            {channelAction(channel.key)}
          </span>
        ) : null}
      </a>
    </li>
  );
}

function ChannelRow({ channel, skin }: { readonly channel: ContactChannel; readonly skin: PublicPageSkin }) {
  const external = channel.href.startsWith('http');
  return (
    <li className="m-0 p-0" style={{ borderBottom: `1px solid ${skin.ring}` }}>
      <a
        href={channel.href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="group flex items-center gap-4 py-4 transition-opacity hover:opacity-75"
      >
        <span
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
          style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
        >
          <ChannelGlyph channelKey={channel.key} className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-sans text-base font-bold" style={{ color: skin.ink }}>
            {channel.label}
          </span>
          <span className="block truncate font-sans text-xs" style={{ color: skin.muted }}>
            {channelHandle(channel)}
          </span>
        </span>
        <span className="flex-none rounded-full px-3 py-1.5 font-sans text-xs font-bold" style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}>
          {channelAction(channel.key)}
        </span>
        <span aria-hidden="true" className="font-sans text-lg" style={{ color: skin.muted }}>
          →
        </span>
      </a>
    </li>
  );
}

/**
 * Isi halaman 404: penanda, judul, deskripsi, dan tautan beranda.
 *
 * @param variant - Gaya klasik, editorial, atau minimal.
 * @param site - Data situs tenant aktif.
 * @param skin - Warna tema template.
 * @returns Konten 404 tanpa shell.
 */
export function NotFoundSection({
  variant,
  site,
  skin,
}: {
  readonly variant: PublicPageVariant;
  readonly site: NetworkSiteData;
  readonly skin: PublicPageSkin;
}) {
  if (variant === 'editorial') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-14 text-left md:py-20">
        <p className="m-0 font-mono text-7xl font-bold tabular-nums sm:text-8xl" style={{ color: skin.accent }}>
          404
        </p>
        <h1 className="m-0 mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: skin.ink }}>
          Halaman tidak ditemukan
        </h1>
        <p className="m-0 mt-3 max-w-md font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
          Konten yang Anda cari tidak tersedia di {site.settings.name} atau telah dipindahkan.
        </p>
        <p className="m-0 mt-6">
          <AccentButton href="/" accent={skin.accent}>Kembali ke beranda</AccentButton>
        </p>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-14 text-center md:py-20">
        <p className="m-0 font-mono text-sm font-bold tabular-nums" style={{ color: skin.muted }}>
          404
        </p>
        <h1 className="m-0 mt-2 font-sans text-2xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
          Halaman tidak ditemukan
        </h1>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
          Konten yang Anda cari tidak tersedia di {site.settings.name} atau telah dipindahkan.
        </p>
        <p className="m-0 mt-5">
          <Link href="/" className="font-sans text-sm font-bold underline underline-offset-4 transition-opacity hover:opacity-75" style={{ color: skin.accent }}>
            Kembali ke beranda →
          </Link>
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-14 text-center md:py-20">
      <p
        className="m-0 inline-block rounded-full px-3.5 py-1.5 font-sans text-xs font-bold tracking-wide text-white"
        style={{ backgroundColor: skin.accent }}
      >
        404
      </p>
      <h1 className="m-0 mt-4 font-sans text-3xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
        Halaman tidak ditemukan
      </h1>
      <p className="m-0 mx-auto mt-3 max-w-md font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
        Konten yang Anda cari tidak tersedia di {site.settings.name} atau telah dipindahkan.
      </p>
      <p className="m-0 mt-6">
        <AccentButton href="/" accent={skin.accent}>Kembali ke beranda</AccentButton>
      </p>
    </div>
  );
}

/**
 * Pita identitas kanal (kategori/tag): kicker, judul, deskripsi, dan hitungan.
 *
 * @param variant - Gaya klasik, editorial, atau minimal.
 * @param site - Data situs tenant aktif.
 * @param kicker - Kicker kanal.
 * @param title - Judul kanal.
 * @param description - Deskripsi kanal.
 * @param skin - Warna tema template.
 * @returns Pita kanal tanpa shell dan daftar.
 */
export function ChannelHeader({
  variant,
  site,
  kicker,
  title,
  description,
  skin,
}: {
  readonly variant: PublicPageVariant;
  readonly site: NetworkSiteData;
  readonly kicker: string;
  readonly title: string;
  readonly description?: string | undefined;
  readonly skin: PublicPageSkin;
}) {
  const statsLine = `${site.articles.length} artikel · ${site.context.normalizedHostname}`;
  if (variant === 'editorial') {
    return (
      <div>
        <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
          {kicker}
        </p>
        <h1 className="m-0 mt-2 font-serif text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: skin.ink }}>
          {title}
        </h1>
        {description === undefined || description === '' ? null : (
          <p className="m-0 mt-3 max-w-2xl font-sans text-[15px] leading-relaxed" style={{ color: skin.muted }}>
            {description}
          </p>
        )}
        <p className="m-0 mt-3 flex items-center gap-2.5 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          <span aria-hidden="true" className="h-px w-8" style={{ backgroundColor: skin.accent }} />
          {statsLine}
        </p>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
          {kicker}
        </p>
        <h1 className="m-0 w-full font-sans text-2xl font-extrabold tracking-tight" style={{ color: skin.ink }}>
          {title}
        </h1>
        {description === undefined || description === '' ? null : (
          <p className="m-0 w-full max-w-2xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>
            {description}
          </p>
        )}
        <p className="m-0 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
          {statsLine}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl p-5 shadow-sm sm:p-6" style={{ backgroundColor: skin.card, outline: `1px solid ${skin.ring}` }}>
      <p
        className="m-0 inline-block rounded-full px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-wider"
        style={{ backgroundColor: `${skin.accent}1A`, color: skin.accent }}
      >
        {kicker}
      </p>
      <h1 className="m-0 mt-3 font-sans text-2xl font-extrabold tracking-tight sm:text-3xl" style={{ color: skin.ink }}>
        {title}
      </h1>
      {description === undefined || description === '' ? null : (
        <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed" style={{ color: skin.muted }}>{description}</p>
      )}
      <p className="m-0 mt-2 font-mono text-[11px] tabular-nums" style={{ color: skin.muted }}>
        {statsLine}
      </p>
    </div>
  );
}
