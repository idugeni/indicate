import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, ChevronDown, Rss } from 'lucide-react';
import type { ReactNode } from 'react';

import type { NetworkSiteData } from '@/modules/delivery/models';
import { COMPANY_NAME, SOCIAL_ORDER } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { StoreBadges } from '@/modules/site/components/network/chrome/store-badges';
import { getSiteCategoryNav } from '@/modules/site/components/network/server/site-nav';
import { NewsletterForm } from '@/modules/site/components/network/ui/newsletter-form';

/** Varian footer yang disepakati dari 6 mockup. */
export type SiteFooterVariant = 'classic' | 'wordmark' | 'newsletter' | 'minimal' | 'premium' | 'mega';

/** Skin minimal agar 10 template berbagi 1 mode tanpa cabang warna per template. */
export interface SiteFooterSkin {
  readonly accent: string;
  readonly tone: 'light' | 'dark';
  readonly card: string;
  readonly ring: string;
  readonly ink: string;
  readonly muted: string;
}

interface SiteFooterProps {
  readonly variant: SiteFooterVariant;
  readonly site: NetworkSiteData;
  readonly skin: SiteFooterSkin;
  readonly templateId: string;
  readonly preferredSource: ReactNode;
  readonly appBlurb: string;
}

interface FooterLink {
  readonly label: string;
  readonly href: string;
}

const PERUSAHAAN_LINKS: readonly FooterLink[] = [
  { label: 'Profil', href: '/tentang' },
  { label: 'Kontak', href: '/kontak' },
];

const BANTUAN_LINKS: readonly FooterLink[] = [
  { label: 'Kebijakan Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat & Ketentuan', href: '/syarat-ketentuan' },
  { label: 'Sitemap', href: '/sitemap.xml' },
  { label: 'Indeks', href: '/indeks' },
];

const LEGAL_LINKS: readonly FooterLink[] = [
  { label: 'Privasi', href: '/kebijakan-privasi' },
  { label: 'Syarat', href: '/syarat-ketentuan' },
  { label: 'Sitemap', href: '/sitemap.xml' },
];

const DARK_FOOTER = {
  surface: '#0b0e1a',
  ink: '#f1f5f9',
  muted: '#94a3b8',
  ring: 'rgba(255,255,255,0.14)',
} as const;

interface Palette {
  readonly surface: string;
  readonly ink: string;
  readonly muted: string;
  readonly ring: string;
}

function paletteFor(skin: SiteFooterSkin, forceDark: boolean): Palette {
  if (forceDark) return { ...DARK_FOOTER };
  return { surface: skin.card, ink: skin.ink, muted: skin.muted, ring: skin.ring };
}

/**
 * Satu mode footer untuk 10 template.
 *
 * @param variant - Salah satu dari 6 gaya mockup yang disetujui.
 * @param site - Data situs tenant aktif.
 * @param skin - Warna aksen dan nada dari tema template.
 * @param templateId - Id template untuk keunikan id input newsletter.
 * @param preferredSource - Tombol Sumber Pilihan milik template.
 * @param appBlurb - Teks kolom aplikasi milik template.
 * @returns Footer server sesuai varian.
 */
export async function SiteFooter({ variant, site, skin, templateId, preferredSource, appBlurb }: SiteFooterProps) {
  const categories = await getSiteCategoryNav(site, variant === 'mega' ? 24 : 6);
  const links: readonly FooterLink[] = categories.map((item) => ({ label: item.label, href: item.href }));
  const tagline = site.settings.tagline ?? site.settings.description;
  const year = new Date().getFullYear();
  const socials = SOCIAL_ORDER.map((name) => ({ name, href: (site.settings.socialLinks[name] ?? '').trim() })).filter(
    (social) => social.href !== '',
  );
  switch (variant) {
    case 'wordmark':
      return (
        <WordmarkFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} templateId={templateId} preferredSource={preferredSource} />
      );
    case 'newsletter':
      return (
        <NewsletterFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} templateId={templateId} preferredSource={preferredSource} />
      );
    case 'minimal':
      return <MinimalFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} preferredSource={preferredSource} />;
    case 'premium':
      return (
        <PremiumFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} preferredSource={preferredSource} />
      );
    case 'mega':
      return <MegaFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} preferredSource={preferredSource} />;
    case 'classic':
    default:
      return (
        <ClassicFooter site={site} tagline={tagline} year={year} links={links} socials={socials} skin={skin} preferredSource={preferredSource} appBlurb={appBlurb} />
      );
  }
}

function BrandRow({
  site,
  tagline,
  palette,
  align = 'left',
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly palette: Palette;
  readonly align?: 'left' | 'center';
}) {
  const centered = align === 'center';
  return (
    <Link
      href="/"
      className={`flex min-w-0 flex-col gap-2.5 leading-none no-underline ${centered ? 'items-center text-center' : 'items-center text-center sm:flex-row sm:items-center sm:text-left'}`}
    >
      <Image
        unoptimized
        src={site.settings.logoUrl}
        alt={site.settings.name}
        width={72}
        height={72}
        className="h-9 w-9 flex-none rounded-xl object-cover"
        style={{ outline: `1px solid ${palette.ring}` }}
      />
      <span className="grid min-w-0 leading-none">
        <strong className="truncate font-sans text-lg font-extrabold tracking-tight" style={{ color: palette.ink }}>
          {site.settings.name}
        </strong>
        <small className="mt-0.5 font-sans text-[11px]" style={{ color: palette.muted }}>
          {tagline}
        </small>
      </span>
    </Link>
  );
}

function SocialRow({
  site,
  socials,
  palette,
  centered = false,
}: {
  readonly site: NetworkSiteData;
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly palette: Palette;
  readonly centered?: boolean;
}) {
  return (
    <p className={`m-0 mt-4 flex flex-wrap items-center gap-2 ${centered ? 'justify-center' : 'justify-center sm:justify-start'}`}>
      {socials.map(({ name, href }) => {
        const Icon = channelIcon(name);
        return (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${site.settings.name} di ${name}`}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: palette.muted, outline: `1px solid ${palette.ring}` }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </a>
        );
      })}
      <Link
        href="/rss.xml"
        aria-label="Umpan RSS"
        className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-70"
        style={{ color: palette.muted, outline: `1px solid ${palette.ring}` }}
      >
        <Rss className="h-4 w-4" aria-hidden="true" />
      </Link>
    </p>
  );
}

function LinkList({
  links,
  palette,
}: {
  readonly links: readonly FooterLink[];
  readonly palette: Palette;
}) {
  return (
    <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
      {links.map((item) => (
        <li key={`${item.href}:${item.label}`} className="m-0 p-0">
          <Link
            href={item.href}
            className="font-sans text-sm transition-opacity hover:opacity-70"
            style={{ color: palette.muted }}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DesktopColumn({
  label,
  links,
  palette,
}: {
  readonly label: string;
  readonly links: readonly FooterLink[];
  readonly palette: Palette;
}) {
  return (
    <nav aria-label={label} className="hidden md:block">
      <h2 className="m-0 font-sans text-sm font-bold" style={{ color: palette.ink }}>
        {label}
      </h2>
      <LinkList links={links} palette={palette} />
    </nav>
  );
}

function MobileAccordion({
  label,
  links,
  palette,
}: {
  readonly label: string;
  readonly links: readonly FooterLink[];
  readonly palette: Palette;
}) {
  return (
    <details className="group md:hidden" style={{ borderBottom: `1px solid ${palette.ring}` }}>
      <summary
        className="flex cursor-pointer list-none items-center justify-between py-3 font-sans text-sm font-bold [&::-webkit-details-marker]:hidden"
        style={{ color: palette.ink }}
      >
        {label}
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" style={{ color: palette.muted }} aria-hidden="true" />
      </summary>
      <div className="pb-4">
        <LinkList links={links} palette={palette} />
      </div>
    </details>
  );
}

function BottomBar({
  site,
  year,
  palette,
  centered = false,
}: {
  readonly site: NetworkSiteData;
  readonly year: number;
  readonly palette: Palette;
  readonly centered?: boolean;
}) {
  return (
    <div style={{ borderTop: `1px solid ${palette.ring}` }}>
      <div
        className={`mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-center font-sans text-xs sm:px-6 ${centered ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:text-left'}`}
        style={{ color: palette.muted }}
      >
        <p className="m-0">
          © {year} {site.settings.name}. Semua hak dilindungi undang-undang.
        </p>
        <p className="m-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {LEGAL_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="transition-opacity hover:opacity-70">
              {item.label}
            </Link>
          ))}
        </p>
        <p className="m-0 font-semibold tracking-wide opacity-80">{COMPANY_NAME}</p>
      </div>
    </div>
  );
}

function ClassicFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  preferredSource,
  appBlurb,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly preferredSource: ReactNode;
  readonly appBlurb: string;
}) {
  const palette = paletteFor(skin, false);
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <BrandRow site={site} tagline={tagline} palette={palette} />
          <p className="m-0 mt-4 max-w-xs font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
            {site.settings.description}
          </p>
          <SocialRow site={site} socials={socials} palette={palette} />
          <div className="m-0 mt-4">{preferredSource}</div>
        </div>
        <div className="md:hidden">
          <div style={{ borderTop: `1px solid ${palette.ring}` }}>
            <MobileAccordion label="Kategori" links={links} palette={palette} />
            <MobileAccordion label="Tentang Kami" links={[...PERUSAHAAN_LINKS, ...BANTUAN_LINKS.slice(0, 2)]} palette={palette} />
          </div>
        </div>
        <DesktopColumn label="Kategori" links={links} palette={palette} />
        <DesktopColumn label="Tentang Kami" links={[...PERUSAHAAN_LINKS, ...BANTUAN_LINKS.slice(0, 2)]} palette={palette} />
        <div className="min-w-0">
          <h2 className="m-0 font-sans text-sm font-bold" style={{ color: palette.ink }}>
            Aplikasi Mobile
          </h2>
          <p className="m-0 mt-4 font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
            {appBlurb}
          </p>
          <StoreBadges />
        </div>
      </div>
      <BottomBar site={site} year={year} palette={palette} />
    </footer>
  );
}

function WordmarkFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  templateId,
  preferredSource,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly templateId: string;
  readonly preferredSource: ReactNode;
}) {
  const palette = paletteFor(skin, true);
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
          <div className="min-w-0">
            <p className="m-0 font-sans text-4xl font-black tracking-tight text-white sm:text-6xl">{site.settings.name}</p>
            <p className="m-0 mt-3 max-w-md font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
              {tagline}
            </p>
          </div>
          <div className="min-w-0">
            <p className="m-0 font-sans text-sm font-semibold text-white">Tetap update dengan berita terbaru.</p>
            <NewsletterForm
              inputId={`${templateId}-footer-newsletter`}
              formClassName="mt-3 flex gap-2"
              inputClassName="h-11 min-w-0 flex-1 rounded-xl px-3 font-sans text-sm"
              buttonClassName="h-11 w-11 flex-none rounded-xl px-0 font-sans text-sm"
              buttonChildren={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
              buttonAriaLabel="Berlangganan newsletter"
            />
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-4" style={{ borderTop: `1px solid ${palette.ring}`, paddingTop: '2.5rem' }}>
          <div className="md:hidden">
            <MobileAccordion label="Berita" links={links} palette={palette} />
            <MobileAccordion label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
            <MobileAccordion label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
          </div>
          <DesktopColumn label="Berita" links={links} palette={palette} />
          <DesktopColumn label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
          <DesktopColumn label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
          <div className="min-w-0">
            <h2 className="m-0 hidden font-sans text-sm font-bold text-white md:block">Ikuti Kami</h2>
            <div className="hidden md:block">
              <SocialRow site={site} socials={socials} palette={palette} />
            </div>
            <p className="m-0 mt-4 md:hidden">
              <SocialRow site={site} socials={socials} palette={palette} centered />
            </p>
            <div className="m-0 mt-4">{preferredSource}</div>
          </div>
        </div>
      </div>
      <BottomBar site={site} year={year} palette={palette} />
    </footer>
  );
}

function NewsletterFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  templateId,
  preferredSource,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly templateId: string;
  readonly preferredSource: ReactNode;
}) {
  const palette = paletteFor(skin, false);
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div
          className="grid items-center gap-6 rounded-2xl p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"
          style={{ backgroundColor: `${skin.accent}12`, outline: `1px solid ${skin.accent}30` }}
        >
          <div className="min-w-0">
            <p className="m-0 font-sans text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: skin.accent }}>
              Berlangganan newsletter
            </p>
            <p className="m-0 mt-2 font-sans text-xl font-extrabold tracking-tight sm:text-2xl" style={{ color: palette.ink }}>
              Dapatkan berita terbaru langsung ke email Anda
            </p>
            <p className="m-0 mt-1 font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
              Berita penting pilihan redaksi setiap hari. Tanpa spam.
            </p>
          </div>
          <div className="min-w-0">
            <NewsletterForm
              inputId={`${templateId}-footer-newsletter`}
              formClassName="flex flex-col gap-2 sm:flex-row"
              inputClassName="h-11 min-w-0 flex-1 rounded-xl px-3 font-sans text-sm"
              buttonClassName="h-11 flex-none rounded-xl px-5 font-sans text-sm"
            />
            <p className="m-0 mt-2 font-sans text-xs" style={{ color: palette.muted }}>
              Kami tidak akan mengirim spam. Baca{' '}
              <Link href="/kebijakan-privasi" className="underline underline-offset-2 transition-opacity hover:opacity-70">
                Kebijakan Privasi
              </Link>
              .
            </p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <BrandRow site={site} tagline={tagline} palette={palette} />
            <SocialRow site={site} socials={socials} palette={palette} />
            <div className="m-0 mt-4">{preferredSource}</div>
          </div>
          <div className="md:hidden">
            <div style={{ borderTop: `1px solid ${palette.ring}` }}>
              <MobileAccordion label="Kategori" links={links.slice(0, 5)} palette={palette} />
              <MobileAccordion label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
              <MobileAccordion label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
            </div>
          </div>
          <DesktopColumn label="Kategori" links={links.slice(0, 5)} palette={palette} />
          <DesktopColumn label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
          <DesktopColumn label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
        </div>
      </div>
      <BottomBar site={site} year={year} palette={palette} />
    </footer>
  );
}

function MinimalFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  preferredSource,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly preferredSource: ReactNode;
}) {
  const palette = paletteFor(skin, false);
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
        <p className="m-0 font-sans text-2xl font-black tracking-tight" style={{ color: palette.ink }}>
          {site.settings.name}
        </p>
        <p className="m-0 mx-auto mt-2 max-w-md font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
          {tagline}
        </p>
        <SocialRow site={site} socials={socials} palette={palette} centered />
        <div className="m-0 mt-4 flex justify-center">{preferredSource}</div>
        <nav aria-label="Navigasi footer" className="m-0 mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((item) => (
            <Link
              key={`${item.href}:${item.label}`}
              href={item.href}
              className="font-sans text-sm font-semibold transition-opacity hover:opacity-70"
              style={{ color: palette.ink }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <BottomBar site={site} year={year} palette={palette} centered />
    </footer>
  );
}

function PremiumFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  preferredSource,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly preferredSource: ReactNode;
}) {
  const palette = paletteFor(skin, true);
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-6 gap-y-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <BrandRow site={site} tagline={tagline} palette={palette} />
          <p className="m-0 mt-4 max-w-xs font-sans text-sm leading-relaxed" style={{ color: palette.muted }}>
            {site.settings.description}
          </p>
          <p className="m-0 mt-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-xs font-bold"
              style={{ color: palette.ink, backgroundColor: 'rgba(255,255,255,0.08)', outline: `1px solid ${palette.ring}` }}
            >
              <BadgeCheck className="h-3.5 w-3.5" style={{ color: skin.accent }} aria-hidden="true" />
              Bagian dari jaringan media Indicate
            </span>
          </p>
          <SocialRow site={site} socials={socials} palette={palette} />
          <div className="m-0 mt-4">{preferredSource}</div>
        </div>
        <div className="md:hidden">
          <div style={{ borderTop: `1px solid ${palette.ring}` }}>
            <MobileAccordion label="Kategori" links={links} palette={palette} />
            <MobileAccordion label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
            <MobileAccordion label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
          </div>
        </div>
        <DesktopColumn label="Kategori" links={links} palette={palette} />
        <DesktopColumn label="Perusahaan" links={PERUSAHAAN_LINKS} palette={palette} />
        <DesktopColumn label="Bantuan" links={BANTUAN_LINKS} palette={palette} />
      </div>
      <BottomBar site={site} year={year} palette={palette} />
    </footer>
  );
}

function MegaFooter({
  site,
  tagline,
  year,
  links,
  socials,
  skin,
  preferredSource,
}: {
  readonly site: NetworkSiteData;
  readonly tagline: string;
  readonly year: number;
  readonly links: readonly FooterLink[];
  readonly socials: readonly { readonly name: string; readonly href: string }[];
  readonly skin: SiteFooterSkin;
  readonly preferredSource: ReactNode;
}) {
  const palette = paletteFor(skin, false);
  const chunks: readonly (readonly FooterLink[])[] =
    links.length === 0
      ? []
      : Array.from({ length: Math.min(4, Math.ceil(links.length / 6)) }, (_, column) =>
          links.slice(column * 6, column * 6 + 6),
        );
  return (
    <footer style={{ backgroundColor: palette.surface, borderTop: `1px solid ${palette.ring}` }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <BrandRow site={site} tagline={tagline} palette={palette} />
          </div>
          <SocialRow site={site} socials={socials} palette={palette} />
        </div>
        <div className="mt-8 md:hidden">
          <div style={{ borderTop: `1px solid ${palette.ring}` }}>
            <MobileAccordion label="Semua Kanal" links={links} palette={palette} />
            <MobileAccordion label="Lainnya" links={[...PERUSAHAAN_LINKS, ...BANTUAN_LINKS]} palette={palette} />
          </div>
        </div>
        <div className="mt-8 hidden gap-8 md:grid md:grid-cols-4 lg:grid-cols-5" style={{ borderTop: `1px solid ${palette.ring}`, paddingTop: '2rem' }}>
          {chunks.map((chunk, column) => (
            <nav key={column} aria-label={column === 0 ? 'Semua kanal' : `Kanal lanjutan ${column + 1}`}>
              {column === 0 ? (
                <h2 className="m-0 font-sans text-sm font-bold" style={{ color: palette.ink }}>
                  Semua Kanal
                </h2>
              ) : null}
              <LinkList links={chunk} palette={palette} />
            </nav>
          ))}
          <nav aria-label="Lainnya">
            <h2 className="m-0 font-sans text-sm font-bold" style={{ color: palette.ink }}>
              Lainnya
            </h2>
            <LinkList links={[...PERUSAHAAN_LINKS, ...BANTUAN_LINKS]} palette={palette} />
          </nav>
        </div>
        <div className="m-0 mt-8 flex justify-start">{preferredSource}</div>
      </div>
      <BottomBar site={site} year={year} palette={palette} />
    </footer>
  );
}
