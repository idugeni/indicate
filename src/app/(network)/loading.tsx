import { TemplateLoader } from '@/modules/site/components/network/network-listing';
import RootLoading from '@/app/loading';
import { resolveTenantBranding } from '@/modules/delivery/tenant-branding';

/**
 * Render fallback segment jaringan yang sudah berbrand tenant.
 *
 * @remarks Boundary ini berjalan sebelum komponen halaman, jadi branding tidak
 * bisa diwarisi dari atas dan harus di-resolve sendiri di sini. Host non-tenant
 * dan kegagalan baca tetap turun ke `RootLoading` tanpa brand, karena shell ini
 * tidak pernah melempar dan `notFound()`-nya tetap milik halaman.
 */
export default async function PublicLoading() {
  const branding = await resolveTenantBranding();
  if (branding === null) return <RootLoading />;
  return <TemplateLoader templateId={branding.templateId} />;
}
