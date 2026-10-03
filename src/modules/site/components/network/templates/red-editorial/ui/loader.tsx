import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

/**
 * Render loader berpalet Red Editorial.
 *
 * @returns Overlay `role="status"` berpalet Red Editorial.
 */
export function RedEditorialLoader(): ReactElement {
  return <BrandedLoader theme={RED_EDITORIAL} />;
}
