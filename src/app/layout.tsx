import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster } from '@/components/ui/sonner';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { cn } from '@/ui/cn';
import './globals.css';

/**
 * Control-plane brand voice for every surface that inherits this layout.
 *
 * @remarks `SERVICE_SUMMARY` is the single description string: it already backs
 * `name="description"` on the landing page, so reusing it here keeps
 * `og:description` and `twitter:description` in step with what search engines
 * already read instead of a second, shorter variant drifting out of sync.
 */
const BRAND_TITLE = 'Indicate - Publishing infrastructure';
const BRAND_IMAGE_ALT = 'Indicate - One Newsroom. Everywhere.';

export const viewport: Viewport = {
  themeColor: '#0e1320',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Control-plane metadataBase fallback. Tenant pages derive absolute canonical/OG URLs from the request host, so this base never anchors tenant content. */
function resolveMetadataBase(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    `https://${(process.env.DASHBOARD_HOST ?? 'indicate.website').toLowerCase()}`;
  try {
    return new URL(raw);
  } catch {
    return new URL('https://indicate.website');
  }
}

const METADATA_BASE = resolveMetadataBase();

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  title: {
    default: BRAND_TITLE,
    template: '%s | Indicate',
  },
  description: SERVICE_SUMMARY,
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
    title: BRAND_TITLE,
    description: SERVICE_SUMMARY,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: BRAND_IMAGE_ALT }],
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND_TITLE,
    description: SERVICE_SUMMARY,
    images: ['/opengraph-image'],
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
 * Portal brand is NOT resolved in the root layout: host + DB reads here
 * would block prerendering of every route (blocking-prerender-dynamic). Tenant
 * chrome comes from per-template shells (`CleanBlueShell` et al., picked by the
 * `network-listing` dispatcher per Site); control shells need no brand. Icons are
 * also NOT declared here: every surface (control-plane via its own metadata
 * layout, tenant via `tenantFavicon`) carries its own icons
 * so no cross-host fallback exists.
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
      <body className="min-h-screen supports-[min-height:100svh]:min-h-svh bg-bg text-paper antialiased">
        {children}
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}