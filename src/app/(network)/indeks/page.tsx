import { Suspense } from 'react';
import type { Metadata } from 'next';

import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';
import { getSiteCategoryIndex } from '@/modules/site/components/network/server/site-nav';
import { IndexPage } from '@/modules/site/components/network/network-index';
import { TemplateLoader } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';

export async function generateMetadata(): Promise<Metadata> {
  const site = await resolveNetworkSite({}, '/indeks');
  const siteName = site.settings.seoSiteName ?? site.settings.name;
  return networkMetadata(
    '/indeks',
    {},
    `Indeks Kanal - ${siteName}`,
    `Daftar A–Z ${siteName}: semua kanal liputan dalam satu halaman.`,
  );
}

/**
 * Render shell indeks kanal dengan fallback berbrand tenant.
 *
 * @remarks Sama dengan rute jaringan lain, branding di-resolve di atas boundary
 * supaya fallback bisa menyebut tenant sebelum situs ter-resolve:
 * `resolveTenantBranding` membaca lewat `classifyTenantHost` yang sudah dedup
 * per request plus template ber-tag 24 jam, jadi cache hangat tidak menambah
 * round-trip baru. Konsekuensinya shell ini tidak lagi dapat di-prerender —
 * tiap request menunggu branding sebelum fallback ter-cat, sementara
 * sebelumnya halaman ini menunggu penuh di boundary segment. Resolusi situs
 * tetap di dalam `IndexContent`.
 */
export default async function IndexPageRoute() {
  const branding = await resolveTenantBranding();
  return (
    <Suspense
      fallback={
        branding === null ? (
          <RootLoading />
        ) : (
          <TemplateLoader templateId={branding.templateId} />
        )
      }
    >
      <IndexContent />
    </Suspense>
  );
}

async function IndexContent() {
  const site = await resolveNetworkSite({}, '/indeks');
  const categories = await getSiteCategoryIndex(site);
  return <IndexPage site={site} categories={categories} path="/indeks" />;
}
