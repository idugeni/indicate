import type { NetworkSiteData } from '@/modules/delivery/models';

import { AD_SLOTS, type AdSlotId } from '@/modules/ads/slots';
import { AdSensePush } from '@/modules/ads/adsense-push';
import { TEMPLATE_AD_MAP } from '@/modules/ads/placement-map';
import { resolveAdSlot, safeTemplateId, type CampaignAdOverrides } from '@/modules/ads/config';
import { isRenderableCreative, type AdCreative } from '@/modules/ads/creatives';
import { MobileAnchorAd } from '@/modules/ads/mobile-anchor-ad';

interface AdSlotProps {
  readonly site: NetworkSiteData;
  readonly slot: AdSlotId;
  readonly eager?: boolean | undefined;
  readonly campaign?: CampaignAdOverrides | undefined;
  readonly className?: string | undefined;
}

function AdLabel() {
  return (
    <p className="m-0 text-center font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">
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
    <iframe
      aria-label="Iklan"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      loading="lazy"
      srcDoc={creative.html}
      className="absolute inset-0 block h-full w-full border-0"
    />
  );
}

/**
 * Renders a real AdSense unit; returns null without a client ID.
 *
 * @param creative - Provider creative carrying the AdSense IDs.
 * @param slot - Semantic slot id for test targeting.
 * @returns AdSense ins element with push loader, or null when clientless.
 */
function AdProvider({ creative, slot }: { readonly creative: Extract<AdCreative, { kind: 'provider' }>; readonly slot: AdSlotId }) {
  if (creative.provider !== 'adsense') return null;
  const clientId = creative.clientId?.trim();
  if (clientId === undefined || clientId === '') return null;
  const slotId = creative.slotId?.trim();
  return (
    <div data-ad-provider={creative.provider} data-ad-slot-name={slot} className="min-w-0">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        {...(slotId === undefined || slotId === '' ? {} : { 'data-ad-slot': slotId })}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <AdSensePush />
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
  if (!isRenderableCreative(resolved.creative)) return null;

  return (
    <div data-ad-slot={slot} className={`my-6 min-w-0 md:my-8${visibility}${className === '' ? '' : ` ${className}`}`}>
      <div className="mx-auto w-full min-w-0" style={{ maxWidth: definition.maxWidthPx }}>
        <AdLabel />
        <div
          className={`relative isolate overflow-clip mt-1 w-full min-w-0 ${creativeRatio === null ? definition.reserveClass : ''}`}
          {...(creativeRatio === null ? {} : { style: { aspectRatio: creativeRatio } })}
        >
          {resolved.creative.kind === 'image' ? (
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
  const active = slots.filter((slot) => {
    const resolved = resolveAdSlot({ templateId, overrides: site.settings.ads ?? {}, slot, campaign: campaign ?? site.settings.adCampaigns });
    return resolved.enabled && isRenderableCreative(resolved.creative);
  });
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
      className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6"
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
      className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6"
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
      className="mx-auto w-full min-w-0 max-w-7xl px-4 sm:px-6"
      campaign={campaign}
    />
  );
}

/**
 * Phone-only sticky anchor: renders `mobile-banner` inside the dismissible
 * bottom bar, or nothing when the slot is off.
 *
 * @param site - Resolved tenant site.
 * @param campaign - Optional per-render campaign override (highest precedence).
 * @returns Dismissible anchor bar, or null when the slot is disabled, unmapped, or creativeless.
 * @remarks The bar chrome (sticky container + close button) must never mount
 * without an ad: an ungated wrapper leaks an empty strip above the footer on
 * phones even though every slot defaults to off.
 */
export function MobileAnchorSlot({ site, campaign }: { readonly site: NetworkSiteData; readonly campaign?: CampaignAdOverrides | undefined }) {
  const templateId = safeTemplateId(site.settings.colors.templateId);
  if (templateId === null) return null;
  const resolved = resolveAdSlot({
    templateId,
    overrides: site.settings.ads ?? {},
    slot: 'mobile-banner',
    campaign: campaign ?? site.settings.adCampaigns,
  });
  if (!resolved.enabled || !isRenderableCreative(resolved.creative)) return null;
  return (
    <MobileAnchorAd>
      <AdSlot site={site} slot="mobile-banner" campaign={campaign} />
    </MobileAnchorAd>
  );
}
