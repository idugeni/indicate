import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

/**
 * Render loader berbranding Warm Editorial.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Warm Editorial.
 */
export function WarmEditorialLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={WARM_EDITORIAL} logoUrl={logoUrl} />;
}