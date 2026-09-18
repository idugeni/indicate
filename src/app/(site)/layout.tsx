import type { ReactNode } from 'react';
import { Suspense } from 'react';
import type { Viewport } from 'next';
import { SiteShell } from '@/modules/site/components/layout/site-shell';
import { requireDashboardSurface } from '@/ui/site/metadata-guard';

export const viewport: Viewport = {
  themeColor: '#f4f2ec',
  colorScheme: 'light',
};

/**
 * Penjaga surface sebagai Suspense island: `requireDashboardSurface()` membaca
 * host request (runtime) sehingga tidak boleh menahan static shell saat
 * prerender. Saat build ia suspend ke fallback; saat request ia resolve diam
 * di host dashboard, atau melempar `notFound()` di surface yang salah.
 * Penegakan utama tetap di proxy (edge, per-request); ini lapis kedua.
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
