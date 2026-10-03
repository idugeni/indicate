import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

/**
 * Render loader berpalet Green Minimal.
 *
 * @returns Overlay `role="status"` berpalet Green Minimal.
 */
export function GreenMinimalLoader(): ReactElement {
  return <BrandedLoader theme={GREEN_MINIMAL} />;
}
