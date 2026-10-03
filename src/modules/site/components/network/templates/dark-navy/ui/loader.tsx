import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Render loader berbranding Dark Navy.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Dark Navy.
 */
export function DarkNavyLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={DARK_NAVY} logoUrl={logoUrl} />;
}