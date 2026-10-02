import type { NetworkAttribution as NetworkAttributionData } from '@/modules/site/about-profile';

interface NetworkAttributionProps {
  readonly attribution: NetworkAttributionData | null;
}

const LINK_STYLES =
  'font-medium text-slate-700 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-900 hover:decoration-slate-600 dark:text-slate-300 dark:decoration-slate-600 dark:hover:text-white dark:hover:decoration-slate-300';

/**
 * Editorial network attribution below the tenant About profile.
 *
 * @param attribution - Directory plus corporate links, or null for non-serving portals.
 * @returns Two contextual dofollow links, or nothing when the portal does not qualify.
 */
export function NetworkAttribution({ attribution }: NetworkAttributionProps) {
  if (!attribution) {
    return null;
  }

  return (
    <p className="font-sans text-sm leading-relaxed text-slate-600 dark:text-slate-400">
      Portal ini diterbitkan di{' '}
      <a href={attribution.networkHref} className={LINK_STYLES}>
        {attribution.networkAnchor}
      </a>{' '}
      oleh{' '}
      <a href={attribution.corporateHref} className={LINK_STYLES}>
        {attribution.corporateName}
      </a>
      .
    </p>
  );
}