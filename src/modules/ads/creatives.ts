/**
 * Tenant-owned creative payloads selectable per slot.
 *
 * @remarks
 * `html` creatives render from tenant configuration, so the dashboard must
 * keep them behind a trusted role: `ad-slot` wraps them in overflow guards
 * but does not sanitize markup. `provider` renders a reserved placeholder
 * only — no third-party script is injected, partly because `src/proxy.ts`
 * allowlists no ad-provider script host yet.
 */
export type AdCreative =
  | {
      readonly kind: 'image';
      readonly imageUrl: string;
      readonly href?: string | undefined;
      readonly alt?: string | undefined;
      readonly width?: number | undefined;
      readonly height?: number | undefined;
    }
  | { readonly kind: 'html'; readonly html: string }
  | {
      readonly kind: 'provider';
      readonly provider: 'adsense';
      readonly clientId?: string | undefined;
      readonly slotId?: string | undefined;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeLinkUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('https://') || (value.startsWith('/') && !value.startsWith('//')))
  );
}

/**
 * Validate an untrusted creative payload from tenant configuration.
 *
 * @param value - Raw creative value from `site_settings.seo.ads` or a campaign.
 * @returns True when the payload is a renderable creative.
 */
export function isAdCreative(value: unknown): value is AdCreative {
  if (!isRecord(value)) return false;
  if (value.kind === 'image') {
    if (!isSafeLinkUrl(value.imageUrl)) return false;
    if (value.href !== undefined && !isSafeLinkUrl(value.href)) return false;
    if (value.alt !== undefined && typeof value.alt !== 'string') return false;
    if (value.width !== undefined && (!Number.isInteger(value.width) || (value.width as number) <= 0)) return false;
    if (value.height !== undefined && (!Number.isInteger(value.height) || (value.height as number) <= 0)) return false;
    return true;
  }
  if (value.kind === 'html') {
    return typeof value.html === 'string' && value.html.length > 0 && value.html.length <= 50000;
  }
  if (value.kind === 'provider') {
    if (value.provider !== 'adsense') return false;
    if (value.clientId !== undefined && typeof value.clientId !== 'string') return false;
    if (value.slotId !== undefined && typeof value.slotId !== 'string') return false;
    return true;
  }
  return false;
}

/**
 * Decide whether a validated creative produces visible markup.
 *
 * @param creative - Validated creative or null when the slot has none.
 * @returns True when rendering emits an image, HTML, or a real provider unit.
 * @remarks A provider creative without a usable client id renders nothing
 * (see `AdProvider`), so callers must treat it like a missing creative
 * instead of reserving an empty box.
 */
export function isRenderableCreative(creative: AdCreative | null): creative is AdCreative {
  if (creative === null) return false;
  if (creative.kind === 'provider') {
    return creative.provider === 'adsense' && (creative.clientId?.trim() ?? '') !== '';
  }
  return true;
}
