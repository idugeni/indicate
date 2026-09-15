import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, Send } from 'lucide-react';
import {
  CONTACT_CHANNELS as CONTACT_CHANNEL_FALLBACK,
  LEGAL_ROUTES,
  SERVICE_NAME,
  SERVICE_TAGLINE,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { getContactChannels } from '@/modules/content/site-content';
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
      { href: '/services', label: 'Layanan Sindikasi' },
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
  return (
    <section aria-labelledby="konsolidasi-redaksi-heading" className="border-t border-hairline">
      <Container className="grid gap-8 py-16 md:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-end">
        <div>
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium tracking-wide text-brass">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
            Kesiapan bermigrasi
          </p>
          <h2 id="konsolidasi-redaksi-heading" className="m-0 mt-4 max-w-2xl font-serif text-3xl font-medium leading-[1.1] tracking-tight text-balance text-paper sm:text-5xl">
            Konsolidasikan seluruh jaringan redaksi Anda.
          </h2>
          <p className="m-0 mt-4 max-w-2xl font-sans text-base leading-relaxed text-paper-dim">
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
          <p className="m-0 mt-6 font-sans text-sm leading-relaxed text-paper-faint">
            {rows
              .filter((channel) => channel.href)
              .map((channel) => channel.title)
              .join(' · ')}
          </p>
        </div>
      </Container>
    </section>
  );
}
