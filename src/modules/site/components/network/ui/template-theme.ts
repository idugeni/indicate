import type { CSSProperties } from 'react';

/** Minimal palette for theme controls: structurally compatible with each template's `theme.ts`. */
export interface TemplateTheme {
  readonly primary: string;
  readonly primaryDark: string;
  readonly primarySoft: string;
  readonly ink: string;
  readonly muted: string;
  readonly faint: string;
  readonly canvas: string;
  readonly card: string;
  readonly ring: string;
  readonly onPrimary?: string | undefined;
  readonly scheme: 'light' | 'dark';
}

/**
 * Map a template palette to scoped `--tpl-*` CSS variables for controls.
 *
 * @param theme - Template palette (e.g. `CLEAN_BLUE`).
 * @returns `style` object for the template shell root; controls read its variables.
 */
export function templateThemeStyle(theme: TemplateTheme): CSSProperties {
  return {
    '--tpl-primary': theme.primary,
    '--tpl-primary-dark': theme.primaryDark,
    '--tpl-primary-soft': theme.primarySoft,
    '--tpl-ink': theme.ink,
    '--tpl-muted': theme.muted,
    '--tpl-faint': theme.faint,
    '--tpl-canvas': theme.canvas,
    '--tpl-card': theme.card,
    '--tpl-ring': theme.ring,
    '--tpl-on-primary': theme.onPrimary ?? '#ffffff',
    '--tpl-scheme': theme.scheme,
  } as CSSProperties;
}
