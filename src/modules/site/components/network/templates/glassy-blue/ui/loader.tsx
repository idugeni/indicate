import type { ReactElement } from 'react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

/**
 * Render loader berbranding Glassy Blue.
 *
 * @param logoUrl - URL absolut logo tenant yang ditampilkan di dalam cincin.
 * @returns Overlay `role="status"` berpalet Glassy Blue.
 */
export function GlassyBlueLoader({ logoUrl }: { readonly logoUrl: string }): ReactElement {
  return <BrandedLoader theme={GLASSY_BLUE} logoUrl={logoUrl} />;
}