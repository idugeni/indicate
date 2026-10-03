import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

/**
 * Render loader berpalet Soft Blue.
 *
 * @returns Overlay `role="status"` berpalet Soft Blue.
 */
export function SoftBlueLoader(): ReactElement {
  return <BrandedLoader theme={SOFT_BLUE} />;
}
