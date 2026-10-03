import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

/**
 * Render loader berpalet Warm Editorial.
 *
 * @returns Overlay `role="status"` berpalet Warm Editorial.
 */
export function WarmEditorialLoader(): ReactElement {
  return <BrandedLoader theme={WARM_EDITORIAL} />;
}
