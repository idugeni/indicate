import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { CSSProperties, ReactNode } from 'react';
import { deliveryComposition } from '@/modules/delivery';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/ui/cn';
import './globals.css';

interface BrandTheme {
  name: string;
  primary: string;
  accent: string;
}

type BrandCSSProperties = CSSProperties & {
  '--site-primary'?: string;
  '--site-accent'?: string;
};

export const viewport: Viewport = {
  themeColor: '#0e1320',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

/** Control-plane metadataBase fallback. Tenant pages derive absolute canonical/OG URLs from the request host, so this base never anchors tenant content. */
function resolveMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    `https://${(process.env.DASHBOARD_HOST ?? 'indicate.web.id').toLowerCase()}`;
  try {
    return new URL(raw);
  } catch {
    return new URL('https://indicate.web.id');
  }
}

const METADATA_BASE = resolveMetadataBase();

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: 'Indicate — Satu Ruang Redaksi untuk Banyak Portal Berita',
    template: '%s | Indicate',
  },
  description:
    'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat. Redaksi menulis satu kali, lalu menerbitkannya ke situs mana pun yang dipilih.',
  applicationName: 'Indicate',
  authors: [{ name: 'Indicate' }],
  creator: 'Indicate',
  publisher: 'Indicate',
  category: 'News Platform',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-snippet': -1,
      'max-image-preview': 'none',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: METADATA_BASE.toString(),
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: METADATA_BASE.toString(),
    siteName: 'Indicate',
    title: 'Indicate — Satu Ruang Redaksi untuk Banyak Portal Berita',
    description:
      'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Indicate — Satu ruang redaksi untuk seluruh jaringan portal berita Anda',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indicate — Satu Ruang Redaksi untuk Banyak Portal Berita',
    description:
      'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/brand/icon.png',
    apple: '/brand/icon.png',
  },
};

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : fallback;
}

async function resolveBrandTheme(): Promise<BrandTheme | null> {
  try {
    const headerList = await headers();
    const host = headerList.get('host');
    if (!host) return null;

    const composition = await deliveryComposition();
    const classification = await composition.resolver.classify(host);

    if (classification.kind !== 'site') {
      return null;
    }

    const site = await composition.content.load(
      classification.context,
      {},
      { path: '/_site-shell', locale: composition.config.seo.defaultLocale }
    );

    if (!site) return null;

    return {
      name: site.settings.name,
      primary: sanitizeColor(site.settings.colors.primary, '#0b5d4b'),
      accent: sanitizeColor(site.settings.colors.accent, '#e9a23b'),
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const brand = await resolveBrandTheme();

  const inlineStyle: BrandCSSProperties | undefined = brand
    ? {
        '--site-primary': brand.primary,
        '--site-accent': brand.accent,
      }
    : undefined;

  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={cn(
        'dark',
        fraunces.variable,
        plexSans.variable,
        plexMono.variable
      )}
    >
      <body
        data-public-site-name={brand?.name}
        style={inlineStyle}
        className="min-h-screen bg-bg text-paper antialiased"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}