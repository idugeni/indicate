import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Render loader berpalet Glassy Blue.
 *
 * @returns Overlay `role="status"` berpalet Glassy Blue.
 */
export function GlassyBlueLoader(): ReactElement {
  return <BrandedLoader theme={GLASSY_BLUE} />;
}
