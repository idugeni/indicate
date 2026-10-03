import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

/**
 * Render loader berpalet Orange Modern.
 *
 * @returns Overlay `role="status"` berpalet Orange Modern.
 */
export function OrangeModernLoader(): ReactElement {
  return <BrandedLoader theme={ORANGE_MODERN} />;
}
