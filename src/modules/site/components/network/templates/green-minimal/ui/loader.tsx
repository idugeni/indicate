import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

/**
 * Render loader berbranding Green Minimal.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Green Minimal.
 */
export function GreenMinimalLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={GREEN_MINIMAL} logoUrl={logoUrl} />;
}