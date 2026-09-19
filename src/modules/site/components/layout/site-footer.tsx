import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, Send } from 'lucide-react';
import {
  LEGAL_ROUTES,
  SERVICE_NAME,
  SERVICE_TAGLINE,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { getContactChannels, type FeatureItem } from '@/modules/content/site-content';
import { SOCIAL_ORDER, resolveContactChannels } from '@/modules/site/company-contact';
import { channelIcon } from '@/modules/site/components/network/channel-icons';
import { currentYear } from '@/modules/site/current-year';
import { Container, PrimaryCta, SecondaryCta } from '@/modules/site/components/layout/content';

interface FooterColumn {
  readonly heading: string;
  readonly label: string;
  readonly links: readonly NavigationLink[];
}

const FOOTER_COLUMNS: readonly FooterColumn[] = Object.freeze([
  {
    heading: 'Platform',
    label: 'Tautan footer platform',
    links: Object.freeze([
      { href: '/services', label: 'Layanan Penerbitan' },
      { href: '/pricing', label: 'Harga' },
      { href: '/faq', label: 'Pusat Bantuan' },
    ]),
  },
  {
    heading: 'Perusahaan',
    label: 'Tautan footer perusahaan',
    links: Object.freeze([
      { href: '/about', label: 'Tentang Indicate' },
      { href: '/contact', label: 'Hubungi Tim' },
    ]),
  },
  {
    heading: 'Legalitas',
    label: 'Tautan footer legalitas',
    links: Object.freeze([
      ...LEGAL_ROUTES,
      { href: '/sitemap.xml', label: 'Peta Situs' },
      { href: '/llms.txt', label: 'llms.txt' },
    ]),
  },
  {
    heading: 'Akses',
    label: 'Tautan footer akses workspace',
    links: Object.freeze([
      { href: '/sign-in', label: 'Masuk Dashboard' },
      { href: '/sign-up', label: 'Buat Akun' },
      { href: '/rss.xml', label: 'RSS' },
    ]),
  },
]);

const LINK_CLASSES =
  'block font-sans text-sm text-[#4c5b6b] transition-colors duration-180 hover:text-[#1a2430] focus-visible:rounded-sm focus-visible:text-[#1a2430] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b88d3a]';

async function SiteFooterContent() {
  const [year, channels] = await Promise.all([currentYear(), getContactChannels()]);
  return <SiteFooterView year={year} channels={channels} />;
}

/**
 * Emits the footer shell during static prerender without touching the database;
 * live contact channels stream in afterwards, falling back to hardcoded contacts.
 */
export function SiteFooter() {
  return (
    <Suspense fallback={<SiteFooterView year={null} channels={[]} />}>
      <SiteFooterContent />
    </Suspense>
  );
}

function SiteFooterView({ year, channels }: { readonly year: number | null; readonly channels: readonly FeatureItem[] }) {
  const mail = channels.find((channel) => channel.href?.startsWith('mailto:'));
  const chat = channels.find((channel) => channel.href?.includes('wa.me'));
  const telegram = channels.find((channel) => channel.href?.includes('t.me'));
  const socials = resolveContactChannels({}).filter((channel) =>
    SOCIAL_ORDER.includes(channel.key as (typeof SOCIAL_ORDER)[number]),
  );

  return (
    <footer className="border-t border-[#e2ded2] bg-white">
      <Container className="grid gap-10 py-12 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <p className="m-0">
            <Image
              src="/brand/indicate-landscape.svg"
              alt="Indicate - Publishing infrastructure"
              width={240}
              height={60}
              className="h-auto w-60"
            />
          </p>
          <p className="m-0 max-w-sm font-sans text-lg font-semibold tracking-tight text-[#1a2430]">
            {SERVICE_TAGLINE}
          </p>
          <address className="m-0 max-w-sm space-y-2 border-t border-[#e2ded2] pt-4 font-sans text-sm not-italic">
            <a
              href={mail?.href ?? 'mailto:sancaphenacakra@gmail.com'}
              className="flex items-center gap-2 text-[#4c5b6b] transition-colors duration-180 hover:text-[#1a2430]"
            >
              <Mail className="h-3.5 w-3.5 flex-none text-[#8a5f1c]" aria-hidden="true" />
              sancaphenacakra@gmail.com
            </a>
            <a
              href={chat?.href ?? 'https://wa.me/6285641159405'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#4c5b6b] transition-colors duration-180 hover:text-[#1a2430]"
            >
              <MessageCircle className="h-3.5 w-3.5 flex-none text-[#8a5f1c]" aria-hidden="true" />
              0856-4115-9405
            </a>
            <a
              href={telegram?.href ?? 'https://t.me/safenca_id'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#4c5b6b] transition-colors duration-180 hover:text-[#1a2430]"
            >
              <Send className="h-3.5 w-3.5 flex-none text-[#8a5f1c]" aria-hidden="true" />
              @safenca_id
            </a>
          </address>
          <p className="m-0 flex flex-wrap items-center gap-2 pt-2">
            {socials.map((channel) => {
              const Icon = channelIcon(channel.key);
              return (
                <a
                  key={channel.key}
                  href={channel.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Indicate di ${channel.label}`}
                  title={channel.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#4c5b6b] ring-1 ring-[#e2ded2] transition-colors duration-180 hover:text-[#1a2430]"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              );
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((column, index) => (
            <div key={column.heading}>
              <h3 className="m-0 mb-4 font-mono text-[11px] font-medium uppercase tracking-wider text-[#5f6b7a]">
                <span aria-hidden="true" className="mr-2 tabular-nums text-[#8a5f1c]">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {column.heading}
              </h3>
              <nav aria-label={column.label} className="space-y-2.5">
                {column.links.map((route: NavigationLink) => (
                  <Link key={route.href} href={route.href} className={LINK_CLASSES}>
                    {route.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </Container>

      <div aria-hidden="true" className="overflow-hidden border-t border-[#e2ded2] select-none">
        <p className="m-0 text-center font-sans text-[20vw] leading-[0.85] font-bold tracking-tight text-[#1a2430] lg:text-[12rem]">
          INDICATE
        </p>
      </div>

      <div className="border-t border-[#e2ded2]">
        <Container className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <small className="font-mono text-[11px] text-[#5f6b7a]">
            {year === null ? (
              <>{SERVICE_NAME}. Hak cipta dilindungi undang-undang.</>
            ) : (
              <>© {year} {SERVICE_NAME}. Hak cipta dilindungi undang-undang.</>
            )}
          </small>
          <small className="font-mono text-[11px] tabular-nums text-[#5f6b7a]">
            PT Sanca Phena Cakra
          </small>
        </Container>
      </div>
    </footer>
  );
}

async function CallToActionContent() {
  const channels = await getContactChannels();
  return <CallToActionView channels={channels} />;
}

/**
 * Streams contact channels after the static shell; prerender emits the fallback.
 */
export function CallToAction() {
  return (
    <Suspense fallback={<CallToActionView channels={[]} />}>
      <CallToActionContent />
    </Suspense>
  );
}

function CallToActionView({ channels }: { readonly channels: readonly FeatureItem[] }) {
  return (
    <section aria-labelledby="konsolidasi-redaksi-heading" className="relative border-t border-[#e2ded2]">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[#b88d3a]" />
      <Container className="grid gap-8 py-16 md:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-end">
        <div>
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-[#8a5f1c]">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-[#b88d3a]" />
            Kesiapan bermigrasi
          </p>
          <h2 id="konsolidasi-redaksi-heading" className="m-0 mt-4 max-w-2xl font-serif text-3xl font-medium leading-[1.1] tracking-tight text-balance text-[#1a2430] sm:text-5xl">
            Konsolidasikan seluruh jaringan redaksi Anda.
          </h2>
          <span aria-hidden="true" className="mt-6 block h-1 w-16 bg-[#b88d3a]" />
          <p className="m-0 mt-4 max-w-2xl font-sans text-base leading-relaxed text-[#4c5b6b]">
            Sampaikan jumlah domain dan unit yang direncanakan — tim kami menyusun arsitektur penyiapan beserta estimasinya, tanpa mengganggu operasi redaksi yang berjalan.
          </p>
        </div>
        <div>
          <div className="flex flex-col gap-3">
            <PrimaryCta href="/contact">
              <span>Jadwalkan diskusi arsitektur</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryCta>
            <SecondaryCta href="/services">
              <span>Lihat layanan</span>
            </SecondaryCta>
          </div>
          <p className="m-0 mt-6 font-mono text-[11px] uppercase leading-relaxed tracking-[0.08em] text-[#5f6b7a]">
            {channels
              .filter((channel) => channel.href)
              .map((channel) => channel.title)
              .join(' · ')}
          </p>
        </div>
      </Container>
    </section>
  );
}
