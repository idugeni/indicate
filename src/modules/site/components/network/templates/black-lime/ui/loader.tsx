import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

/**
 * Render loader berbranding Black Lime.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Black Lime.
 */
export function BlackLimeLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={BLACK_LIME} logoUrl={logoUrl} />;
}