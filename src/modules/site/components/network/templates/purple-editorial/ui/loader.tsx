import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

/**
 * Render loader berpalet Purple Editorial.
 *
 * @returns Overlay `role="status"` berpalet Purple Editorial.
 */
export function PurpleEditorialLoader(): ReactElement {
  return <BrandedLoader theme={PURPLE_EDITORIAL} />;
}
