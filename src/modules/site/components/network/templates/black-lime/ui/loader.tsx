import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

/**
 * Render loader berpalet Black Lime.
 *
 * @returns Overlay `role="status"` berpalet Black Lime.
 */
export function BlackLimeLoader(): ReactElement {
  return <BrandedLoader theme={BLACK_LIME} />;
}
