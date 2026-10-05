import type { TemplateId } from '@/modules/site/components/network/templates/listing-shared';

import type { AdSlotId } from '@/modules/ads/slots';

/**
 * Placement zones inside one template shell.
 *
 * @remarks
 * The registry replaces template conditionals: a template declares which
 * semantic slots it exposes per zone, and `AdSlot` renders nothing for slots
 * outside the active template's set. Zones mirror the shell anatomy
 * (`header` above the sticky header, `top` below it, `anchor` for the
 * phone-only sticky bar, `footer` above the footer) plus the four page kinds
 * that carry inline placements (`listing`, `article`, `channel`, `search`).
 */
export interface TemplateAdZones {
  readonly header: readonly AdSlotId[];
  readonly top: readonly AdSlotId[];
  readonly listing: readonly AdSlotId[];
  readonly article: readonly AdSlotId[];
  readonly channel: readonly AdSlotId[];
  readonly search: readonly AdSlotId[];
  readonly anchor: readonly AdSlotId[];
  readonly footer: readonly AdSlotId[];
}

/**
 * Per-template placement map: every template keeps its character, every
 * placement stays a registry lookup.
 *
 * @remarks
 * The `article` zone is identical across templates by design: article pages
 * are structural clones, so ad topology is not template character — palette
 * and spacing are. The `mobile-banner` anchor lives in every shell
 * (site-wide, ponsel saja) so it is mapped ONLY in `anchor`, which
 * `MobileAnchorSlot` alone consumes: page components must never render
 * `mobile-banner` in-flow, keeping every mobile page at exactly one anchor
 * unit. `search` carries one `in-feed` unit between the search form and the
 * results on every template. `sidebar-bottom` ships only where a rail column
 * exists (`article` semua template, `listing` dark-navy). Per-template
 * character lives in `header`, `top`, `listing`, `channel`, and `footer`.
 * Keep `article` uniform; gate page-level experiments behind a new slot id
 * instead of forking one template.
 */
export const TEMPLATE_AD_MAP: Record<TemplateId, TemplateAdZones> = {
  'clean-blue': {
    header: [],
    top: ['leaderboard'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['content-middle'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'black-lime': {
    header: [],
    top: ['top-banner'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['in-feed'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'dark-navy': {
    header: [],
    top: ['below-navigation'],
    listing: ['hero-ad', 'sidebar-top', 'sidebar-bottom'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['content-middle'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'glassy-blue': {
    header: ['header-top'],
    top: [],
    listing: ['in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['in-feed'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'green-minimal': {
    header: [],
    top: ['leaderboard'],
    listing: ['in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['content-middle'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'orange-modern': {
    header: [],
    top: ['top-banner'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['in-feed'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'purple-editorial': {
    header: [],
    top: ['below-navigation'],
    listing: ['hero-ad'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['content-middle'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'red-editorial': {
    header: ['header-top'],
    top: [],
    listing: ['in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['in-feed'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'soft-blue': {
    header: [],
    top: ['leaderboard'],
    listing: ['hero-ad', 'in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['content-middle'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
  'warm-editorial': {
    header: [],
    top: ['below-navigation'],
    listing: ['in-feed'],
    article: ['in-content', 'content-middle', 'content-bottom', 'sidebar-top', 'sidebar-bottom'],
    channel: ['in-feed'],
    search: ['in-feed'],
    anchor: ['mobile-banner'],
    footer: ['footer-banner'],
  },
};
