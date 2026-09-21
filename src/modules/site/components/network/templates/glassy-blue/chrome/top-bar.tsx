import type { NetworkSiteData } from '@/modules/delivery/models';

/**
 * Light top bar: today's date on the left, tagline on the right.
 *
 * @param site - Tenant site data for the tagline.
 * @returns Server-only top bar above the main header.
 */
export function GlassyBlueTopBar({ site }: { readonly site: NetworkSiteData }) {
  const today = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());
  const tagline = site.settings.tagline ?? site.settings.description;

  return (
    <div className="hidden border-b border-white/60 bg-[#edf4ff] md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <p className="m-0 font-sans text-xs font-medium capitalize text-slate-600">
          <time dateTime={new Date().toISOString()}>{today}</time>
        </p>
        <p className="m-0 truncate font-sans text-xs text-slate-500">{tagline}</p>
      </div>
    </div>
  );
}
