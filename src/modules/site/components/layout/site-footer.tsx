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
    links: LEGAL_ROUTES,
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

export function SiteFooter() {
  const year = new Date().getFullYear();

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
              href="mailto:officialelsa21@gmail.com"
              className="flex items-center gap-2 text-paper-dim transition-colors duration-180 hover:text-paper"
            >
              <Mail className="h-3.5 w-3.5 flex-none text-brass" aria-hidden="true" />
              officialelsa21@gmail.com
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

      <div className="border-t border-hairline">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4">
          <small className="font-mono text-[11px] text-paper-faint">
            © {year} {SERVICE_NAME} · PostgreSQL 17 · Strict RLS · Cloudflare Edge
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
    <section className="border-t border-hairline">
      <Container className="grid gap-10 py-14 md:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="space-y-4">
          <p className="m-0 flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-wider text-brass">
            <span aria-hidden="true" className="h-px w-8 flex-none bg-brass/70" />
            Kesiapan Enterprise
          </p>
          <h2 className="m-0 max-w-md font-sans text-2xl font-bold leading-tight tracking-tight text-balance text-paper sm:text-3xl">
            Konsolidasikan seluruh jaringan redaksi Anda.
          </h2>
          <p className="m-0 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
            Sampaikan jumlah domain dan unit yang direncanakan — tim kami menyusun arsitektur penyiapan beserta estimasinya, tanpa mengganggu operasi redaksi yang berjalan.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <PrimaryCta href="/contact">
              <span>Jadwalkan Diskusi Arsitektur</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </PrimaryCta>
            <SecondaryCta href="/services">
              <span>Lihat Layanan & Harga</span>
            </SecondaryCta>
          </div>
        </div>

        <ol className="m-0 grid list-none content-start gap-0 p-0">
          {rows.map((channel, index) => (
            <li
              key={channel.title}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-4 border-t border-hairline py-5 last:border-b"
            >
              <span className="font-mono text-xs tabular-nums text-brass">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="m-0 font-sans text-base font-semibold tracking-tight text-paper">
                  {channel.title}
                </h3>
                <p className="m-0 mt-1 max-w-md font-sans text-sm leading-relaxed text-paper-dim">
                  {channel.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
