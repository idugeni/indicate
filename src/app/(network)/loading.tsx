import { CleanBlueLoader } from '@/modules/site/components/network/templates/clean-blue/loader';

/** Tenant public suspense skeleton: loader global template, statis agar tidak
 *  menahan prerender dan tanpa query tambahan (tanpa skeleton). */
export default function PublicLoading() {
  return <CleanBlueLoader label="Memuat berita" />;
}
