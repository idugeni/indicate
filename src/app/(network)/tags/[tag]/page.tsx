import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChannelPage, TemplateLoader } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { networkMetadata, resolveNetworkSite } from '@/modules/delivery/network-runtime';
import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';
import { TAG_MAX_LENGTH, normalizeSlugCandidate } from '@/modules/site/slug-allocator';
import { notFoundMetadata } from '@/modules/site/seo';

export const maxDuration = 25;

type Props = {
  readonly params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') {
    return notFoundMetadata();
  }
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  return networkMetadata(`/tags/${clean}`, { tag: clean });
}

/**
 * Render shell topik dengan fallback berbrand tenant.
 *
 * @remarks Branding di-resolve di atas boundary supaya fallback bisa menyebut
 * tenant sebelum situs ter-resolve: `resolveTenantBranding` membaca lewat
 * `classifyTenantHost` yang sudah dedup per request plus template ber-tag 24
 * jam, jadi cache hangat tidak menambah round-trip baru. Konsekuensinya shell
 * ini tidak lagi dapat di-prerender — tiap request menunggu branding sebelum
 * fallback ter-cat, sementara sebelumnya fallback langsung stream. Validasi
 * params tetap di dalam `TagContent` supaya shell tidak menahan 404.
 */
export default async function TagPage({ params }: Props) {
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
      <TagContent params={params} />
    </Suspense>
  );
}

async function TagContent({ params }: Pick<Props, 'params'>) {
  const { tag } = await params;
  const raw = decodeURIComponent(tag);
  if (raw.trim() === '') notFound();
  const clean = normalizeSlugCandidate(raw).slice(0, TAG_MAX_LENGTH);
  const site = await resolveNetworkSite({ tag: clean }, `/tags/${clean}`);
  return <ChannelPage site={site} kicker="Topik" title={`#${clean}`} path={`/tags/${clean}`} />;
}
