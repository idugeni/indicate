/**
 * Semantic ad slot catalog: placement meaning, never a template name.
 *
 * @remarks
 * Templates reference these ids through `TEMPLATE_AD_MAP`, so a slot keeps
 * one definition while each template maps only the slots that fit its layout.
 * Width leads everywhere: the slot is fluid up to `maxWidthPx`, and height
 * always follows a real ratio — either the creative's own dimensions
 * (image creatives carry width/height attributes) or `reserveClass`, whose
 * every breakpoint ratio MUST exist verbatim in `sizes` (mobile → smallest
 * fitting width, md → 728, lg → 970). Never invent a ratio: an unknown
 * creative keeps its reserved box instead of shifting layout (no CLS).
 * Image rendering is responsive display by construction (width 100%,
 * height auto), matching Google's recommended default; `sizes` documents
 * the servable Google standard units per slot, including mobile
 * (300×50 sticky, 300×100/200) and rail (160×600 skyscraper, 250×250).
 * `reserveClass` and `visibilityClass` are static Tailwind literals (the JIT
 * scanner only sees string literals) that keep a disabled-free layout stable:
 * fluid width, capped max width, reserved aspect per breakpoint, no fixed
 * pixel width on small screens.
 */
export const AD_SLOT_IDS = [
  'header-top',
  'leaderboard',
  'top-banner',
  'below-navigation',
  'hero-ad',
  'in-feed',
  'in-content',
  'content-middle',
  'content-bottom',
  'sidebar-top',
  'sidebar-middle',
  'sidebar-bottom',
  'mobile-banner',
  'footer-banner',
] as const;

export type AdSlotId = (typeof AD_SLOT_IDS)[number];

export type AdCreativeFormat = 'image' | 'html' | 'provider';

export type AdDeviceClass = 'desktop' | 'tablet' | 'mobile';

export interface AdCreativeSize {
  readonly width: number;
  readonly height: number;
}

export interface AdSlotDefinition {
  readonly id: AdSlotId;
  readonly label: string;
  readonly description: string;
  readonly sizes: readonly AdCreativeSize[];
  readonly allowedFormats: readonly AdCreativeFormat[];
  readonly devices: readonly AdDeviceClass[];
  readonly maxWidthPx: number;
  readonly reserveClass: string;
  readonly visibilityClass: string;
}

const IMAGE_HTML_PROVIDER: readonly AdCreativeFormat[] = ['image', 'html', 'provider'];
const ALL_DEVICES: readonly AdDeviceClass[] = ['desktop', 'tablet', 'mobile'];

/** Single source of truth for every semantic placement the network supports. */
export const AD_SLOTS: Record<AdSlotId, AdSlotDefinition> = {
  'header-top': {
    id: 'header-top',
    label: 'Header top',
    description: 'Above the sticky site header; scrolls away and never overlaps navigation.',
    sizes: [{ width: 970, height: 90 }, { width: 728, height: 90 }, { width: 468, height: 60 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] md:aspect-[728/90] lg:aspect-[970/90]',
    visibilityClass: '',
  },
  leaderboard: {
    id: 'leaderboard',
    label: 'Leaderboard',
    description: 'Full-width banner directly below the header, inside the page container.',
    sizes: [{ width: 970, height: 90 }, { width: 728, height: 90 }, { width: 468, height: 60 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] sm:aspect-[728/90] lg:aspect-[970/90]',
    visibilityClass: '',
  },
  'top-banner': {
    id: 'top-banner',
    label: 'Top banner',
    description: 'Billboard-grade banner below the header for templates with a bold hero.',
    sizes: [{ width: 970, height: 250 }, { width: 970, height: 90 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] md:aspect-[970/90]',
    visibilityClass: '',
  },
  'below-navigation': {
    id: 'below-navigation',
    label: 'Below navigation',
    description: 'Slim strip under the nav for templates that keep the header compact.',
    sizes: [{ width: 728, height: 90 }, { width: 970, height: 90 }, { width: 468, height: 60 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] sm:aspect-[728/90] lg:aspect-[970/90]',
    visibilityClass: '',
  },
  'hero-ad': {
    id: 'hero-ad',
    label: 'Hero ad',
    description: 'Between the hero block and the next content section on listing pages.',
    sizes: [{ width: 970, height: 250 }, { width: 728, height: 90 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] md:aspect-[728/90] lg:aspect-[970/250]',
    visibilityClass: '',
  },
  'in-feed': {
    id: 'in-feed',
    label: 'In feed',
    description: 'Inline card between listing or channel sections; flows with the feed.',
    sizes: [{ width: 728, height: 90 }, { width: 336, height: 280 }, { width: 300, height: 250 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 728,
    reserveClass: 'aspect-[300/250] md:aspect-[728/90]',
    visibilityClass: '',
  },
  'in-content': {
    id: 'in-content',
    label: 'In content',
    description: 'Centered rectangle after the featured image, before the article body.',
    sizes: [{ width: 336, height: 280 }, { width: 300, height: 250 }, { width: 300, height: 200 }, { width: 250, height: 250 }, { width: 200, height: 200 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 336,
    reserveClass: 'aspect-[300/250]',
    visibilityClass: '',
  },
  'content-middle': {
    id: 'content-middle',
    label: 'Content middle',
    description: 'Mid-page break after the body and gallery on articles, or between channel sections.',
    sizes: [{ width: 728, height: 90 }, { width: 336, height: 280 }, { width: 300, height: 250 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 728,
    reserveClass: 'aspect-[300/250] md:aspect-[728/90]',
    visibilityClass: '',
  },
  'content-bottom': {
    id: 'content-bottom',
    label: 'Content bottom',
    description: 'After tags on articles, before the publisher footer.',
    sizes: [{ width: 728, height: 90 }, { width: 300, height: 250 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 728,
    reserveClass: 'aspect-[320/100] md:aspect-[728/90]',
    visibilityClass: '',
  },
  'sidebar-top': {
    id: 'sidebar-top',
    label: 'Sidebar top',
    description: 'Top of a desktop rail column; hidden below lg where rails collapse.',
    sizes: [{ width: 300, height: 250 }, { width: 336, height: 280 }, { width: 250, height: 250 }, { width: 200, height: 200 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ['desktop'],
    maxWidthPx: 336,
    reserveClass: 'aspect-[300/250]',
    visibilityClass: 'hidden lg:block',
  },
  'sidebar-middle': {
    id: 'sidebar-middle',
    label: 'Sidebar middle',
    description: 'Mid-rail rectangle; reserved for templates that grow a rail column.',
    sizes: [{ width: 300, height: 250 }, { width: 336, height: 280 }, { width: 250, height: 250 }, { width: 200, height: 200 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ['desktop'],
    maxWidthPx: 336,
    reserveClass: 'aspect-[300/250]',
    visibilityClass: 'hidden lg:block',
  },
  'sidebar-bottom': {
    id: 'sidebar-bottom',
    label: 'Sidebar bottom',
    description: 'Tall half-page unit at the rail end; reserved for rail templates.',
    sizes: [{ width: 300, height: 600 }, { width: 160, height: 600 }, { width: 300, height: 250 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ['desktop'],
    maxWidthPx: 300,
    reserveClass: 'aspect-[300/600]',
    visibilityClass: 'hidden lg:block',
  },
  'mobile-banner': {
    id: 'mobile-banner',
    label: 'Mobile banner',
    description: 'Phone-only strip; never renders desktop widths.',
    sizes: [{ width: 320, height: 100 }, { width: 300, height: 100 }, { width: 300, height: 50 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ['mobile'],
    maxWidthPx: 320,
    reserveClass: 'aspect-[320/100]',
    visibilityClass: 'md:hidden',
  },
  'footer-banner': {
    id: 'footer-banner',
    label: 'Footer banner',
    description: 'Full-width banner above the site footer, inside the page container.',
    sizes: [{ width: 970, height: 90 }, { width: 728, height: 90 }, { width: 468, height: 60 }, { width: 320, height: 100 }],
    allowedFormats: IMAGE_HTML_PROVIDER,
    devices: ALL_DEVICES,
    maxWidthPx: 970,
    reserveClass: 'aspect-[320/100] md:aspect-[728/90] lg:aspect-[970/90]',
    visibilityClass: '',
  },
};
