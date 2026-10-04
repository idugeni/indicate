import type { TemplateId } from '@/modules/site/components/network/templates/listing-shared';

import type { AdSlotId } from '@/modules/ads/slots';

/**
 * Placement zones inside one template shell.
 *
 * @remarks
 * The registry replaces template conditionals: a template declares which
 * semantic slots it exposes per zone, and `AdSlot` renders nothing for slots
 * outside the active template's set. Zones mirror the shell anatomy
 * (`header` above the sticky header, `top` below it, `footer` above the
 * footer) plus the three page kinds that carry inline placements.
 */
export interface TemplateAdZones {
  readonly header: readonly AdSlotId[];
  readonly top: readonly AdSlotId[];
  readonly listing: readonly AdSlotId[];
  readonly article: readonly AdSlotId[];
  readonly channel: readonly AdSlotId[];
  readonly footer: readonly AdSlotId[];
}

/**
 * Per-template placement map: every template keeps its character, every
 * placement stays a registry lookup. Sidebar slots stay unmapped until a
 * template ships a real page-level rail column; forcing them into the
 * current single-column pages would break each template's identity.
 */
export const TEMPLATE_AD_MAP: Record<TemplateId, TemplateAdZones> = {
  'clean-blue': {
    header: [],
    top: ['leaderboard'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom'],
    channel: ['content-middle'],
    footer: ['footer-banner'],
  },
  'black-lime': {
    header: [],
    top: ['top-banner'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle'],
    channel: ['in-feed'],
    footer: ['footer-banner'],
  },
  'dark-navy': {
    header: [],
    top: ['below-navigation'],
    listing: ['hero-ad', 'sidebar-top'],
    article: ['in-content', 'content-middle', 'mobile-banner'],
    channel: ['content-middle'],
    footer: ['footer-banner'],
  },
  'glassy-blue': {
    header: ['header-top'],
    top: [],
    listing: ['in-feed'],
    article: ['in-content', 'content-bottom'],
    channel: ['in-feed'],
    footer: ['footer-banner'],
  },
  'green-minimal': {
    header: [],
    top: ['leaderboard'],
    listing: ['in-feed'],
    article: ['in-content', 'content-bottom'],
    channel: ['content-middle'],
    footer: ['footer-banner'],
  },
  'orange-modern': {
    header: [],
    top: ['top-banner'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom'],
    channel: ['in-feed'],
    footer: ['footer-banner'],
  },
  'purple-editorial': {
    header: [],
    top: ['below-navigation'],
    listing: ['hero-ad'],
    article: ['in-content', 'content-middle'],
    channel: ['content-middle'],
    footer: ['footer-banner'],
  },
  'red-editorial': {
    header: ['header-top'],
    top: [],
    listing: ['in-feed'],
    article: ['in-content', 'content-bottom', 'mobile-banner'],
    channel: ['in-feed'],
    footer: ['footer-banner'],
  },
  'soft-blue': {
    header: [],
    top: ['leaderboard'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle'],
    channel: ['content-middle'],
    footer: ['footer-banner'],
  },
  'warm-editorial': {
    header: [],
    top: ['below-navigation'],
    listing: ['in-feed'],
    article: ['in-content', 'content-bottom'],
    channel: ['in-feed'],
    footer: ['footer-banner'],
  },
};
