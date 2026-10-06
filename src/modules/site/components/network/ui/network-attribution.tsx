import type { NetworkAttribution as NetworkAttributionData } from '@/modules/site/about-profile';

interface NetworkAttributionProps {
  readonly attribution: NetworkAttributionData | null;
}

const LINK_STYLES =
  'font-medium text-[var(--tpl-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tpl-primary)]';

/**
 * Editorial network attribution below the tenant About profile.
 *
 * @param attribution - Directory plus corporate links, or null for non-serving portals.
 * @returns Two contextual dofollow links, or nothing when the portal does not qualify.
 * @remarks Colours ride `--tpl-*` template variables, never `dark:` variants:
 * `<html>` always carries the `dark` class and the custom variant keys off
 * it, so `dark:text-…` is active on every template including light ones and
 * washes the line out on light canvases.
 */
export function NetworkAttribution({ attribution }: NetworkAttributionProps) {
  if (!attribution) {
    return null;
  }

  return (
    <p className="font-sans text-sm leading-relaxed text-[var(--tpl-muted)]">
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