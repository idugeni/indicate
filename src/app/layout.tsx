import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/ui/cn';
import './globals.css';

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
    default: 'Indicate — One Signal, Multiple Distribution Channels',
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
    title: 'Indicate — One Signal, Multiple Distribution Channels',
    description:
      'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Indicate — One Signal, Multiple Distribution Channels',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Indicate — One Signal, Multiple Distribution Channels',
    description:
      'Indicate menyatukan pengelolaan puluhan domain berita ke dalam satu Dashboard terpusat.',
    images: ['/opengraph-image'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
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

/**
 * Brand portal TIDAK di-resolve di root layout: pembacaan host + DB di sini
 * menahan prerender seluruh rute (blocking-prerender-dynamic). Chrome tenant
 * berasal dari shell per-template (`CleanBlueShell` dkk., dipilih dispatcher
 * `network-listing` per Site); shell kontrol tidak butuh brand.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
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
      <body className="min-h-screen bg-bg text-paper antialiased">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}