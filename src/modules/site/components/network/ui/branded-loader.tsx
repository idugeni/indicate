import type { ReactElement } from 'react';

import { templateThemeStyle, type TemplateTheme } from '@/modules/site/components/network/ui/template-theme';

export interface BrandedLoaderProps {
  /** Template palette; supplies the canvas background and indicator colors. */
  readonly theme: TemplateTheme;
  /** Accessible name for assistive tech. No visible text is rendered. */
  readonly label?: string;
}

/**
 * Render overlay memuat berpalet template: satu titik berputar mengorbit
 * cincin tipis, memakai warna `--tpl-primary` saja.
 *
 * Tanpa logo tenant: berkas logo yang diunggah tenant praktis selalu berupa
 * *wordmark* persegi panjang di dalam kanvas persegi, jadi di dalam lingkaran
 * ia terbaca sebagai kotak gelap — bukan sebagai logo.
 *
 * Geometri orbit dan kebijakan `prefers-reduced-motion` ada di `globals.css`
 * sebagai `.brand-orbit*`, bukan di inline style — lihat komentar blok itu.
 *
 * @param theme - Palet template; supplying kanvas latar dan warna indikator lewat variabel `--tpl-*`.
 * @param label - Nama aksesibel untuk teknologi bantu; tidak ada teks yang terlihat.
 * @returns Overlay `role="status"` tanpa teks terlihat.
 */
export function BrandedLoader({ theme, label = 'Memuat' }: BrandedLoaderProps): ReactElement {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      style={templateThemeStyle(theme)}
      className="fixed inset-0 z-[100] grid place-items-center bg-[var(--tpl-canvas)] [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <div
        aria-hidden="true"
        className="relative grid h-[min(9rem,34vmin)] w-[min(9rem,34vmin)] place-items-center"
      >
        <span data-brand-orbit="track" className="brand-orbit-track" />
        <span data-brand-orbit="dot" className="brand-orbit" />
      </div>
    </div>
  );
}
