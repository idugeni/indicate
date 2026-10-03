import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

/**
 * Render loader berbranding Soft Blue.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Soft Blue.
 */
export function SoftBlueLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={SOFT_BLUE} logoUrl={logoUrl} />;
}