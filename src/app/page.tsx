import type { Metadata, Viewport } from 'next';

import { indexableRobots, tenantFacebook } from '@/modules/site/seo';
import { getBootstrapConfig } from '@/core/config/bootstrap/bootstrap-config';
import { controlPlaneIcons } from '@/ui/site/metadata-guard';
import { resolveGoogleSiteVerification } from '@/core/config/google-verification';
import { SERVICE_SUMMARY } from '@/ui/site/marketing-content';
import { LandingPage } from '@/modules/site/components/landing-page';

export async function generateMetadata(): Promise<Metadata> {
  const google = resolveGoogleSiteVerification();
  return {
    description: SERVICE_SUMMARY,
    robots: indexableRobots(),
    ...(google === undefined ? {} : { verification: { google } }),
    ...controlPlaneIcons(),
    // Reads process.env synchronously, so the page stays statically rendered
    // (see the remark below) while still emitting the tag.
    ...tenantFacebook(getBootstrapConfig().credentials.facebookAppToken?.reveal()),
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: '#f4f2ec',
  colorScheme: 'light',
};

/**
 * Render the control-plane landing page.
 *
 * @remarks Statically rendered on purpose. Classifying the host with
 * `headers()` made this route dynamic, and under `cacheComponents` the
 * resulting hole never resolved: the build emitted a 3.3KB shell carrying
 * `loading.tsx`, and every request answered 200 with a body truncated at
 * roughly 23KB once the platform cut the stream. `proxy.ts` already routes
 * strictly by host, passing the dashboard surface through and rewriting every
 * other `/` to `(network)/tenant-home`, so this file is only ever reached on
 * the control plane and does not need to re-derive that. `proxy.test.ts` locks
 * the invariant; reintroducing a host check here brings the hang back.
 */
export default function RootPage() {
  return <LandingPage />;
}
