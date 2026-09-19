import RootLoading from '@/app/loading';

/**
 * Tenant fallback before site resolves: template is still unknown, so the
 * platform-neutral loader renders instead of any template-owned identity.
 */
export default function PublicLoading() {
  return <RootLoading />;
}
