import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Viewport } from 'next';
import { SiteShell } from '@/modules/site/components/layout/site-shell';
import { requireDashboardSurface } from '@/ui/site/metadata-guard';

export const viewport: Viewport = {
  themeColor: '#f4f2ec',
  colorScheme: 'light',
};

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

/**
 * Surface guard as a Suspense island: `requireDashboardSurface()` reads
 * the request host (runtime) so it must not block the static shell during
 * prerender. At build time it suspends to the fallback; per request it resolves
 * silently on the dashboard host, or throws `notFound()` on the wrong surface.
 * Primary enforcement stays in the proxy (edge, per-request); this is the second layer.
 */
async function SurfaceGuard() {
  await requireDashboardSurface();
  return null;
}

/** Site layout: shared SiteShell + Dashboard-surface host guard so pages stay thin and never repeat the check. */
export default function SiteLayout({ children }: { readonly children: ReactNode }) {
  return (
    <SiteShell>
      <Suspense fallback={null}>
        <SurfaceGuard />
      </Suspense>
      {children}
    </SiteShell>
  );
}
