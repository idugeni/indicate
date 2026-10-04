import type { Viewport } from 'next';

/**
 * Site-wide zoom lock: every surface spreads this into its `viewport` export.
 */
export const LOCKED_ZOOM_VIEWPORT: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};
