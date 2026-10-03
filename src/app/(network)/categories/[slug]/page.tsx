import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage, TemplateLoader } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';
import { normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { notFoundMetadata } from '@/modules/site/seo';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug.trim() === '') {
    return notFoundMetadata();
  }
  const clean = normalizeSlugCandidate(slug);
  return networkMetadata(`/categories/${clean}`, { categorySlug: clean });
}

/**
 * Render shell kanal dengan fallback berbrand tenant.
 *
 * @remarks Branding di-resolve di atas boundary supaya fallback bisa menyebut
 * tenant sebelum situs ter-resolve: `resolveTenantBranding` membaca lewat
 * `classifyTenantHost` yang sudah dedup per request plus template ber-tag 24
 * jam, jadi cache hangat tidak menambah round-trip baru. Konsekuensinya shell
 * ini tidak lagi dapat di-prerender — tiap request menunggu branding sebelum
 * fallback ter-cat, sementara sebelumnya fallback langsung stream. Validasi
 * params tetap di dalam `CategoryContent` supaya shell tidak menahan 404.
 */
export default async function CategoryPage({ params }: Props) {
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
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: Pick<Props, 'params'>) {
  const { slug } = await params;
  if (slug.trim() === '') notFound();
  const clean = normalizeSlugCandidate(slug);
  const site = await resolveNetworkSite({ categorySlug: clean }, `/categories/${clean}`);
  const name = site.articles[0]?.categoryName ?? clean;
  return <ChannelPage site={site} kicker="Kanal liputan" title={name} path={`/categories/${clean}`} />;
}
