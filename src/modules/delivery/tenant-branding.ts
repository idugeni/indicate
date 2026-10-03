import 'server-only';

import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

import { deliveryComposition } from '@/modules/delivery/delivery-composition';
import { classifyTenantHost } from '@/modules/delivery/network-runtime';
import type { ResolvedSiteContext } from '@/modules/delivery/models';
import { normalizeTemplateId, type TemplateId } from '@/modules/site/components/network/templates/listing-shared';

/**
 * Template tunggal hasil migrasi `single_template_clean_blue`, dipakai hanya
 * saat baris pengaturan belum ada atau isinya bukan id terdaftar.
 */
const FALLBACK_TEMPLATE_ID: TemplateId = 'clean-blue';

/** Branding minimum tenant untuk merender shell sebelum situs ter-resolve. */
export interface TenantBranding {
  /** Hostname tenant yang sudah ter-resolve. */
  readonly hostname: string;
  /** Id template ternormalisasi; tidak pernah nilai tak dikenal. */
  readonly templateId: string;
  /**
   * URL absolut logo tenant.
   *
   * @remarks Logo bukan kolom yang tersimpan: `/logo.png` adalah rute
   * deterministik per host yang dilayani `src/app/logo.png/route.ts` dari media
   * yang di-resolve sendiri. Karena itu branding ini nol baca basis data untuk
   * logo, dan mengembalikannya ke lookup pengaturan hanya akan menambah satu
   * round-trip per host tanpa mengubah byte yang dilayani.
   */
  readonly logoUrl: string;
}

/**
 * Normalisasi id template mentah, dengan fallback saat tidak terdaftar.
 *
 * @param raw - Id template dari kolom generated, atau null saat baris pengaturan kosong.
 * @returns Id template terdaftar; tidak pernah melempar.
 * @remarks `normalizeTemplateId` sengaja melempar untuk id tak dikenal supaya
 * renderer's template salah ketahuan. Shell ini berjalan sebelum situs ter-resolve
 * dan tidak boleh menggagalkan cat, jadi id yang tidak dikenal turun ke template
 * tunggal alih-alih lolos mentah ke palet.
 */
function toTemplateId(raw: string | null): TemplateId {
  if (raw === null) return FALLBACK_TEMPLATE_ID;
  try {
    return normalizeTemplateId(raw);
  } catch {
    return FALLBACK_TEMPLATE_ID;
  }
}

/**
 * Baca id template tenant lewat cache bersama.
 *
 * @param context - Resolved tenant hostname context.
 * @returns Id template tersimpan, atau null saat belum ada baris pengaturan.
 * @remarks `routingVersion` ikut key karena aktivasi hostname menaikkan
 * `host:`/`site:` anyway; perubahan template lewat dashboard merevalidasi tag
 * `org:`. TTL 24 jam hanyalah backstop untuk satu skalar per host.
 */
async function readCachedTemplateId(context: ResolvedSiteContext): Promise<string | null> {
  const cached = unstable_cache(
    async () => (await deliveryComposition()).repository.loadSiteTemplateId(context),
    [`site-branding-template:${context.normalizedHostname}:${context.siteId}:${context.routingVersion}`],
    {
      tags: [`host:${context.normalizedHostname}`, `site:${context.siteId}`, `org:${context.organizationId}`],
      revalidate: 86400,
    },
  );
  return cached();
}

/**
 * Ambil branding tenant yang cukup untuk merender loading state berlabel.
 *
 * @returns Branding tenant, atau null saat host bukan satu situs tenant aktif
 *   atau pembacaan template gagal.
 * @remarks Tidak pernah melempar dan tidak pernah memanggil `notFound()`: shell
 * ini berada di dalam `<Suspense>` yang sengaja diletakkan di luar resolusi
 * situs, jadi satu baca yang gagal harus menurunkan shell tanpa brand, bukan
 * menggagalkan cat. Lookup hostname memakai `classifyTenantHost` yang sudah
 * dedup per request, jadi shell ini tidak menambah resolusi host kedua.
 */
export async function resolveTenantBranding(): Promise<TenantBranding | null> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const classification = await classifyTenantHost(host);
  if (classification.kind !== 'site') return null;
  const context = classification.context;
  let templateId: string | null;
  try {
    templateId = await readCachedTemplateId(context);
  } catch {
    return null;
  }
  return {
    hostname: context.normalizedHostname,
    templateId: toTemplateId(templateId),
    logoUrl: `https://${context.normalizedHostname}/logo.png`,
  };
}