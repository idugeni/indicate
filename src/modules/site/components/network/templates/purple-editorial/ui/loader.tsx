import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Render loader berbranding Purple Editorial.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Purple Editorial.
 */
export function PurpleEditorialLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={PURPLE_EDITORIAL} logoUrl={logoUrl} />;
}