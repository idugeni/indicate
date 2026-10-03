import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';

/**
 * Render loader berpalet Clean Blue.
 *
 * @returns Overlay `role="status"` berpalet Clean Blue.
 */
export function CleanBlueLoader(): ReactElement {
  return <BrandedLoader theme={CLEAN_BLUE} />;
}
