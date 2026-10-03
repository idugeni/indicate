import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';

/**
 * Render loader berbranding Clean Blue.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Clean Blue.
 */
export function CleanBlueLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={CLEAN_BLUE} logoUrl={logoUrl} />;
}