import type { ReactNode } from 'react';
import { SiteShell } from '@/modules/site/components/layout/site-shell';
import { requireDashboardSurface } from '@/ui/site/metadata-guard';

/** Site layout: shared SiteShell + Dashboard-surface host guard so pages stay thin and never repeat the check. */
export default async function SiteLayout({ children }: { readonly children: ReactNode }) {
  await requireDashboardSurface();
  return <SiteShell>{children}</SiteShell>;
}