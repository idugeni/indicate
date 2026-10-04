import Link from 'next/link';

import type { NetworkSiteData } from '@/modules/delivery/models';

import { AD_SLOTS, type AdSlotId } from '@/modules/ads/slots';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { resolveAdSlot, safeTemplateId, type CampaignAdOverrides } from '@/modules/ads/config';
import type { AdCreative } from '@/modules/ads/creatives';

interface AdSlotProps {
  readonly site: NetworkSiteData;
  readonly slot: AdSlotId;
  readonly eager?: boolean | undefined;
  readonly campaign?: CampaignAdOverrides | undefined;
  readonly className?: string | undefined;
}

function AdLabel() {
  return (
    <p className="sr-only">
      Iklan
    </p>
  );
}

function AdImage({ creative, eager }: { readonly creative: Extract<AdCreative, { kind: 'image' }>; readonly eager: boolean }) {
  const intrinsic = creative.width !== undefined && creative.width > 0 ? { maxWidth: creative.width } : {};
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- plain img is deliberate: images.unoptimized is true and creative hosts are unknown at build time, so next/image adds no optimization while native loading/decoding keeps zero client JS
    <img
      src={creative.imageUrl}
      alt={creative.alt ?? 'Iklan'}
      loading={eager ? undefined : 'lazy'}
      decoding="async"
      {...(creative.width === undefined ? {} : { width: creative.width })}
      {...(creative.height === undefined ? {} : { height: creative.height })}
      {...(Object.keys(intrinsic).length === 0 ? {} : { style: intrinsic })}
      className="mx-auto h-auto w-full object-contain"
    />
  );
  if (creative.href === undefined) return img;
  return (
    <a href={creative.href} target="_blank" rel="sponsored noopener noreferrer" className="block min-w-0">
      {img}
    </a>
  );
}

function AdHtml({ creative }: { readonly creative: Extract<AdCreative, { kind: 'html' }> }) {
  return (
    <div
      className="min-w-0 [&_iframe]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full [&_video]:max-w-full"
      dangerouslySetInnerHTML={{ __html: creative.html }}
    />
  );
}

function AdProvider({ creative, slot }: { readonly creative: Extract<AdCreative, { kind: 'provider' }>; readonly slot: AdSlotId }) {
  return (
    <div
      data-ad-provider={creative.provider}
      {...(creative.clientId === undefined ? {} : { 'data-ad-client': creative.clientId })}
      {...(creative.slotId === undefined ? {} : { 'data-ad-slot-id': creative.slotId })}
      className="flex min-h-full min-w-0 flex-col items-center justify-center p-3 text-center"
    >
      <p className="m-0 font-sans text-xs text-slate-400">
        Slot {slot} siap untuk penyedia {creative.provider}.
      </p>
    </div>
  );
}

function AdEmpty({ slot, siteName }: { readonly slot: AdSlotId; readonly siteName: string }) {
  return (
    <div data-ad-state="empty" className="flex min-h-full min-w-0 flex-col items-center justify-center gap-1.5 bg-[var(--tpl-primary,#1a5fd0)]/[0.06] p-4 text-center ring-1 ring-inset ring-[var(--tpl-primary,#1a5fd0)]/15">
      <p className="m-0 font-sans text-sm font-extrabold tracking-tight text-[var(--tpl-ink,#0f172a)]">
        Ruang ini tersedia untuk promosi Anda
      </p>
      <p className="m-0 font-sans text-xs leading-relaxed text-[var(--tpl-muted,#475569)]">
        Jangkau pembaca setia {siteName}.
      </p>
      <Link
        href="/kontak"
        className="mt-1 inline-flex items-center justify-center rounded-full bg-[var(--tpl-primary,#1a5fd0)] px-4 py-2 font-sans text-xs font-bold text-[var(--tpl-on-primary,#ffffff)] transition-colors hover:bg-[var(--tpl-primary-dark,#155cb8)]"
      >
        Pasang Iklan
      </Link>
      <p className="sr-only">
        Ruang {slot} tersedia.
      </p>
    </div>
  );
}

/**
 * Single reusable ad placement: templates call this (or a zone helper below)
 * and never touch provider logic. Server-rendered with zero client
 * JavaScript: no fetch, no duplicate request, no hydration. Returns null for
 * unmapped or disabled slots, so placement JSX stays declarative.
 *
 * @param site - Resolved tenant site carrying template id and ad overrides.
 * @param slot - Semantic slot from the catalog.
 * @param eager - Above-the-fold slots skip `loading="lazy"`.
 * @param campaign - Optional per-render campaign override (highest precedence).
 * @param className - Optional extra classes for the slot root.
 * @returns Reserved-space ad container, or null when the slot is off.
 */
export function AdSlot({ site, slot, eager = false, campaign, className = '' }: AdSlotProps) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null) return null;
  const resolved = resolveAdSlot({ templateId, overrides: site.settings.ads ?? {}, slot, campaign: campaign ?? site.settings.adCampaigns });
  if (!resolved.enabled) return null;
  const definition = AD_SLOTS[slot];
  const visibility = definition.visibilityClass === '' ? '' : ` ${definition.visibilityClass}`;
  const creativeRatio =
    resolved.creative?.kind === 'image' &&
    resolved.creative.width !== undefined &&
    resolved.creative.height !== undefined &&
    resolved.creative.width > 0 &&
    resolved.creative.height > 0
      ? `${resolved.creative.width} / ${resolved.creative.height}`
      : null;

  return (
    <div data-ad-slot={slot} className={`my-8 min-w-0${visibility}${className === '' ? '' : ` ${className}`}`}>
      <div className="mx-auto w-full min-w-0" style={{ maxWidth: definition.maxWidthPx }}>
        <AdLabel />
        <div
          className={`mt-1 w-full min-w-0 ${creativeRatio === null ? definition.reserveClass : ''}`}
          {...(creativeRatio === null ? {} : { style: { aspectRatio: creativeRatio } })}
        >
          {resolved.creative === null ? (
            <AdEmpty slot={slot} siteName={site.settings.name} />
          ) : resolved.creative.kind === 'image' ? (
            <AdImage creative={resolved.creative} eager={eager} />
          ) : resolved.creative.kind === 'html' ? (
            <AdHtml creative={resolved.creative} />
          ) : (
            <AdProvider creative={resolved.creative} slot={slot} />
          )}
        </div>
      </div>
    </div>
  );
}

function ZoneSlots({
  site,
  slots,
  className,
  eager = false,
  campaign,
}: {
  readonly site: NetworkSiteData;
  readonly slots: readonly AdSlotId[];
  readonly className: string;
  readonly eager?: boolean | undefined;
  readonly campaign?: CampaignAdOverrides | undefined;
}) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null || slots.length === 0) return null;
  const active = slots.filter(
    (slot) => resolveAdSlot({ templateId, overrides: site.settings.ads ?? {}, slot, campaign: campaign ?? site.settings.adCampaigns }).enabled,
  );
  if (active.length === 0) return null;
  return (
    <div className={className}>
      {active.map((slot) => (
        <AdSlot key={slot} site={site} slot={slot} eager={eager} campaign={campaign} />
      ))}
    </div>
  );
}

/**
 * Header zone: renders above the sticky header inside the shell.
 *
 * @param site - Resolved tenant site.
 * @returns Mapped header slots, or null when the template maps none.
 */
export function AdHeaderTop({ site, campaign }: { readonly site: NetworkSiteData; readonly campaign?: CampaignAdOverrides | undefined }) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null) return null;
  return (
    <ZoneSlots
      site={site}
      slots={TEMPLATE_AD_MAP[templateId].header}
      className="mx-auto w-full min-w-0 max-w-7xl px-4 pt-3 sm:px-6 [&_[data-ad-slot]]:my-0"
      eager
      campaign={campaign}
    />
  );
}

/**
 * Below-navigation zone: first block inside `main`, aligned to page content.
 *
 * @param site - Resolved tenant site.
 * @returns Mapped top slots, or null when the template maps none.
 */
export function AdShellTop({ site, campaign }: { readonly site: NetworkSiteData; readonly campaign?: CampaignAdOverrides | undefined }) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null) return null;
  return (
    <ZoneSlots
      site={site}
      slots={TEMPLATE_AD_MAP[templateId].top}
      className="mx-auto w-full min-w-0 max-w-7xl px-4 pt-4 sm:px-6 md:pt-6 [&_[data-ad-slot]]:my-0"
      eager
      campaign={campaign}
    />
  );
}

/**
 * Pre-footer zone: last block inside `main`, aligned to page content.
 *
 * @param site - Resolved tenant site.
 * @returns Mapped footer slots, or null when the template maps none.
 */
export function AdShellBottom({ site, campaign }: { readonly site: NetworkSiteData; readonly campaign?: CampaignAdOverrides | undefined }) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null) return null;
  return (
    <ZoneSlots
      site={site}
      slots={TEMPLATE_AD_MAP[templateId].footer}
      className="mx-auto w-full min-w-0 max-w-7xl px-4 pb-4 sm:px-6 md:pb-6 [&_[data-ad-slot]]:my-0"
      campaign={campaign}
    />
  );
}
