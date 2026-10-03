import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

/**
 * Render loader berbranding Red Editorial.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Red Editorial.
 */
export function RedEditorialLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={RED_EDITORIAL} logoUrl={logoUrl} />;
}