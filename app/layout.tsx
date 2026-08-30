import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { CSSProperties, ReactNode } from 'react';
import { stage5Composition } from './stage5-composition';
import './globals.css';

export const metadata: Metadata = {
  title: 'Indicate Control Plane',
  description: 'Shared control plane for the Indicate publishing platform.',
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  let brand: { name: string; primary: string; accent: string } | null = null;
  try {
    const composition = stage5Composition();
    const classification = await composition.resolver.classify((await headers()).get('host'));
    if (classification.kind === 'site') {
      const site = await composition.content.load(classification.context, {}, { path: '/_site-shell', locale: composition.config.seo.defaultLocale });
      if (site !== null) brand = { name: site.settings.name, primary: site.settings.colors.primary ?? '#0b5d4b', accent: site.settings.colors.accent ?? '#e9a23b' };
    }
  } catch { /* Child route error boundary remains sanitized and uses safe defaults. */ }
  const style = brand === null ? undefined : { '--site-primary': brand.primary, '--site-accent': brand.accent } as CSSProperties;
  return <html lang="id"><body data-public-site-name={brand?.name} style={style}>{children}</body></html>;
}
