import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Mail, MessageCircle, Send } from 'lucide-react';
import {
  CONTACT_CHANNELS as CONTACT_CHANNEL_FALLBACK,
  LEGAL_ROUTES,
  SERVICE_NAME,
  SERVICE_TAGLINE,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { getContactChannels } from '@/modules/content/site-content';
import { currentYear } from '@/modules/site/current-year';
import { CHANNEL_ICONS, Container, PrimaryCta, SecondaryCta, withIcons } from '@/modules/site/components/layout/content';

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
      { href: '/services', label: 'Layanan Sindikasi' },
      { href: '/pricing', label: 'Paket & Lisensi' },
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
    ]),
  },
]);

const LINK_CLASSES =
  'block font-sans text-sm text-paper-dim transition-colors duration-180 hover:text-paper focus-visible:rounded-sm focus-visible:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass';

export async function SiteFooter() {
  const year = await currentYear();

  return (
    <footer className="border-t border-hairline">
      <Container className="grid gap-10 py-12 md:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center bg-brass font-sans text-sm font-bold text-bg"
              aria-hidden="true"
            >
              I
            </div>
            <span className="font-sans text-lg font-semibold tracking-tight text-paper">
              {SERVICE_NAME}
            </span>
          </div>
          <p className="m-0 max-w-sm font-sans text-sm leading-relaxed text-paper-dim">
            {SERVICE_TAGLINE}
          </p>
          <address className="m-0 max-w-sm space-y-2 border-t border-hairline pt-4 font-sans text-sm not-italic">
            <a
              href="mailto:sancaphenacakra@gmail.com"
              className="flex items-center gap-2 text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <Mail className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
              sancaphenacakra@gmail.com
            </a>
            <a
              href="https://wa.me/6285641159405"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <MessageCircle className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
              0856-4115-9405
            </a>
            <a
              href="https://t.me/eliyantosarage"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <Send className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
              @eliyantosarage
            </a>
          </address>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.heading}>
              <h3 className="m-0 mb-4 font-mono text-[11px] font-medium uppercase tracking-wider text-paper-faint">
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

      <div aria-hidden="true" className="overflow-hidden border-t border-hairline select-none">
        <p className="m-0 text-center font-sans text-[20vw] leading-[0.85] font-bold tracking-tight text-transparent [-webkit-text-stroke:1px_var(--hairline-strong)] lg:text-[12rem]">
          INDICATE
        </p>
      </div>

      <div className="border-t border-hairline">
        <Container className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <small className="font-mono text-[11px] text-paper-faint">
            © {year} Eliyanto Sarage · {SERVICE_NAME} · PostgreSQL 17 · Strict RLS · Cloudflare Edge
          </small>
          <small className="font-mono text-[11px] tabular-nums text-paper-faint">
            ID-id · Asia/Jakarta
          </small>
        </Container>
      </div>
    </footer>
  );
}

export async function CallToAction() {
  const channels = await getContactChannels();
  const rows = channels.length > 0 ? channels : CONTACT_CHANNEL_FALLBACK;
  const cards = withIcons(rows, CHANNEL_ICONS);
  return (
    <section className="border-t border-hairline">
      <Container className="py-14 md:py-20">
        <div className="rounded-lg border border-hairline bg-[color-mix(in_srgb,var(--brass)_6%,var(--bg-raised))] p-5 sm:p-6">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-brass">
                <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
                Kesiapan Enterprise
              </p>
              <h2 className="m-0 mt-4 max-w-2xl font-sans text-xl font-bold leading-tight tracking-tight text-balance text-paper sm:text-2xl">
                Konsolidasikan seluruh jaringan redaksi Anda.
              </h2>
              <p className="m-0 mt-2 max-w-2xl font-sans text-sm leading-relaxed text-paper-dim">
                Sampaikan jumlah domain dan unit yang direncanakan — tim kami menyusun arsitektur penyiapan beserta estimasinya, tanpa mengganggu operasi redaksi yang berjalan.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-stretch">
              <PrimaryCta href="/contact" className="lg:w-full">
                <span>Jadwalkan Diskusi Arsitektur</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </PrimaryCta>
              <SecondaryCta href="/services" className="lg:w-full">
                <span>Lihat Layanan & Harga</span>
              </SecondaryCta>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-5">
            {cards.map((channel) => {
              const isExternal =
                channel.href !== undefined && /^https?:/.test(channel.href);
              const chip = (
                <>
                  <span className="text-brass" aria-hidden="true">
                    {channel.icon}
                  </span>
                  <span>{channel.title}</span>
                  {channel.href ? (
                    <ArrowUpRight className="h-3 w-3 text-paper-faint" aria-hidden="true" />
                  ) : null}
                </>
              );
              const chipClass =
                'inline-flex items-center gap-2 rounded border border-hairline bg-bg px-3 py-1.5 font-mono text-xs text-paper-dim transition-colors duration-180 hover:border-brass/60 hover:text-paper';
              return channel.href ? (
                <a
                  key={channel.title}
                  href={channel.href}
                  title={channel.description}
                  {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={chipClass}
                >
                  {chip}
                </a>
              ) : (
                <span key={channel.title} title={channel.description} className={chipClass}>
                  {chip}
                </span>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
