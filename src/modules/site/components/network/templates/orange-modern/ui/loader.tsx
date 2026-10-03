import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

/**
 * Render loader berbranding Orange Modern.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Orange Modern.
 */
export function OrangeModernLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={ORANGE_MODERN} logoUrl={logoUrl} />;
}