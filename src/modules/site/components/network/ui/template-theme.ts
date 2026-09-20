import type { CSSProperties } from 'react';

/** Palet minimal untuk kontrol tema: cocok struktural dengan tiap `theme.ts` template. */
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
 * Petakan palet template ke variabel CSS `--tpl-*` untuk kontrol scoped.
 *
 * @param theme - Palet template (mis. `CLEAN_BLUE`).
 * @returns Objek `style` untuk root shell template; kontrol baca variabelnya.
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
