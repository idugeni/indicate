import type { NetworkAttribution } from '@/modules/site/about-profile';

/**
 * Editorial network attribution below the tenant About profile.
 *
 * @param attribution - Directory plus corporate links, or null for non-serving portals.
 * @returns Two contextual dofollow links, or nothing when the portal does not qualify.
 */
export function NetworkAttribution({ attribution }: { readonly attribution: NetworkAttribution | null }) {
  if (attribution === null) return null;
  return (
    <p className="font-sans text-sm text-slate-600">
      Portal ini diterbitkan di <a className="underline underline-offset-2 hover:text-slate-900" href={attribution.networkHref}>{attribution.networkAnchor}</a> oleh <a className="underline underline-offset-2 hover:text-slate-900" href={attribution.corporateHref}>{attribution.corporateName}</a>.
    </p>
  );
}
