import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Mail, MessageCircle, Send } from 'lucide-react';
import {
  LEGAL_ROUTES,
  SERVICE_NAME,
  SERVICE_TAGLINE,
  type FeatureItem,
  type NavigationLink,
} from '@/ui/site/marketing-content';
import { currentYear } from '@/modules/site/current-year';

const PLATFORM_LINKS: readonly NavigationLink[] = Object.freeze([
  { href: '/services', label: 'Layanan sindikasi' },
  { href: '/pricing', label: 'Harga' },
  { href: '/about', label: 'Tentang Indicate' },
  { href: '/faq', label: 'Pusat bantuan' },
  { href: '/contact', label: 'Hubungi tim' },
]);

const ACCESS_LINKS: readonly NavigationLink[] = Object.freeze([
  { href: '/sign-in', label: 'Masuk Dashboard' },
  { href: '/sign-up', label: 'Buat akun' },
  { href: '/sitemap.xml', label: 'Peta situs' },
  { href: '/llms.txt', label: 'llms.txt' },
]);

export async function LandingFooter({ channels }: { readonly channels: readonly FeatureItem[] }) {
  const year = await currentYear();
  const mail = channels.find((channel) => channel.href?.startsWith('mailto:'));
  const chat = channels.find((channel) => channel.href?.includes('wa.me'));
  const telegram = channels.find((channel) => channel.href?.includes('t.me'));
  return (
    <footer className="border-t border-[#e2ded2] bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="m-0">
            <Image
              src="/brand/indicate-landscape.svg"
              alt="Indicate — Publishing infrastructure"
              width={240}
              height={60}
              className="h-auto w-60"
            />
          </p>
          <p className="m-0 mt-5 max-w-sm font-serif text-xl leading-snug tracking-tight text-[#1a2430]">
            {SERVICE_TAGLINE}
          </p>
          <address className="m-0 mt-6 grid gap-2.5 text-sm not-italic">
            {mail ? (
              <a
                href={mail.href}
                className="group inline-flex items-center gap-2.5 text-[#4c5b6b] transition-colors hover:text-[#1a2430]"
              >
                <Mail className="h-4 w-4 flex-none text-[#8a5f1c]" aria-hidden="true" />
                sancaphenacakra@gmail.com
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ) : null}
            {chat ? (
              <a
                href={chat.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 text-[#4c5b6b] transition-colors hover:text-[#1a2430]"
              >
                <MessageCircle className="h-4 w-4 flex-none text-[#8a5f1c]" aria-hidden="true" />
                0856-4115-9405
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ) : null}
            {telegram ? (
              <a
                href={telegram.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 text-[#4c5b6b] transition-colors hover:text-[#1a2430]"
              >
                <Send className="h-4 w-4 flex-none text-[#8a5f1c]" aria-hidden="true" />
                @eliyantosarage
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </a>
            ) : null}
          </address>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <nav aria-label="Tautan platform">
            <p className="m-0 font-mono text-[11px] font-medium tracking-[0.14em] text-[#5f6b7a] uppercase">Platform</p>
            <ul className="m-0 mt-4 grid list-none gap-2.5 p-0">
              {PLATFORM_LINKS.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className="text-sm text-[#4c5b6b] underline-offset-4 transition-colors hover:text-[#1a2430] hover:underline"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Tautan akses">
            <p className="m-0 font-mono text-[11px] font-medium tracking-[0.14em] text-[#5f6b7a] uppercase">Akses</p>
            <ul className="m-0 mt-4 grid list-none gap-2.5 p-0">
              {ACCESS_LINKS.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className="text-sm text-[#4c5b6b] underline-offset-4 transition-colors hover:text-[#1a2430] hover:underline"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Tautan legalitas">
            <p className="m-0 font-mono text-[11px] font-medium tracking-[0.14em] text-[#5f6b7a] uppercase">Legalitas</p>
            <ul className="m-0 mt-4 grid list-none gap-2.5 p-0">
              {LEGAL_ROUTES.map((route) => (
                <li key={route.href}>
                  <Link
                    href={route.href}
                    className="text-sm text-[#4c5b6b] underline-offset-4 transition-colors hover:text-[#1a2430] hover:underline"
                  >
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
      <div className="border-t border-[#e2ded2]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-5 py-4 font-mono text-[11px] text-[#5f6b7a] sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="m-0">© {year} {SERVICE_NAME}. Hak cipta dilindungi undang-undang.</p>
          <p className="m-0 tabular-nums">PT Sanca Phena Cakra</p>
        </div>
      </div>
    </footer>
  );
}
