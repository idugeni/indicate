import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

/**
 * Render loader berpalet Dark Navy.
 *
 * @returns Overlay `role="status"` berpalet Dark Navy.
 */
export function DarkNavyLoader(): ReactElement {
  return <BrandedLoader theme={DARK_NAVY} />;
}
