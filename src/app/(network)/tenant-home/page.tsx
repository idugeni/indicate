import { Suspense } from 'react';
import type { Metadata } from 'next';

import { ListingPage, TemplateLoader } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';

export const maxDuration = 25;

export async function generateMetadata(): Promise<Metadata> {
  return networkMetadata('/');
}

/**
 * Render shell portal dengan fallback berbrand tenant.
 *
 * @remarks Branding di-resolve di atas boundary supaya fallback bisa menyebut
 * tenant sebelum situs ter-resolve: `resolveTenantBranding` membaca lewat
 * `classifyTenantHost` yang sudah dedup per request plus template ber-tag 24
 * jam, jadi cache hangat tidak menambah round-trip baru. Konsekuensinya shell
 * ini tidak lagi dapat di-prerender — tiap request menunggu branding sebelum
 * fallback ter-cat, sementara sebelumnya fallback langsung stream. Resolusi
 * hostname tetap di dalam `TenantHomeContent` supaya shell tidak menahan 404.
 */
export default async function TenantHomePage() {
  const branding = await resolveTenantBranding();
  return (
    <Suspense
      fallback={
        branding === null ? (
          <RootLoading />
        ) : (
          <TemplateLoader templateId={branding.templateId} logoUrl={branding.logoUrl} />
        )
      }
    >
      <TenantHomeContent />
    </Suspense>
  );
}

async function TenantHomeContent() {
  const site = await resolveNetworkSite({}, '/');
  return <ListingPage site={site} title={site.settings.name} />;
}
