import Image from 'next/image';
import type { ReactElement } from 'react';

import { templateThemeStyle, type TemplateTheme } from '@/modules/site/components/network/ui/template-theme';

export interface BrandedLoaderProps {
  /** Template palette; supplies the canvas background and ring colors. */
  readonly theme: TemplateTheme;
  /** Absolute tenant logo URL, e.g. https://portal.example/logo.png */
  readonly logoUrl: string;
  /** Accessible name for assistive tech. No visible text is rendered. */
  readonly label?: string;
}

// Gradien cincin menutup 360° penuh dengan kaki yang memudar (bukan lencil),
// sehingga keadaan diam tetap terbaca sebagai cincin utuh, bukan busur terpisah.
const OUTER_RING_GRADIENT =
  'conic-gradient(from 0deg, color-mix(in srgb, var(--tpl-primary) 35%, transparent) 0deg, var(--tpl-primary) 110deg, var(--tpl-primary) 250deg, color-mix(in srgb, var(--tpl-primary) 35%, transparent) 360deg)';

const INNER_RING_GRADIENT =
  'conic-gradient(from 200deg, color-mix(in srgb, var(--tpl-primary) 18%, transparent) 0deg, color-mix(in srgb, var(--tpl-primary) 62%, transparent) 120deg, color-mix(in srgb, var(--tpl-primary) 62%, transparent) 240deg, color-mix(in srgb, var(--tpl-primary) 18%, transparent) 360deg)';

// `mask-image` hanya memotong alfa: `transparent`=center, `black`=alfa penuh
// dan tidak pernah dicat, jadi cincin cukup satu elemen tanpa menebak warna
// apa yang ada di belakangnya.
const OUTER_RING_MASK = 'radial-gradient(closest-side, transparent 82%, black 82%)';
const INNER_RING_MASK = 'radial-gradient(closest-side, transparent 76%, black 76%)';

/**
 * Render overlay memuat berlogo tenant: logo dalam lingkaran dengan dua cincin gradien berputar berlawanan arah.
 *
 * @param theme - Palet template; supplying kanvas latar dan warna cincin lewat variabel `--tpl-*`.
 * @param logoUrl - URL absolut logo tenant, disajikan apa adanya tanpa optimasi gambar.
 * @param label - Nama aksesibel untuk teknologi bantu; tidak ada teks yang terlihat.
 * @returns Overlay `role="status"` berisi logo tenant tanpa teks terlihat.
 */
export function BrandedLoader({ theme, logoUrl, label = 'Memuat' }: BrandedLoaderProps): ReactElement {
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
        <span
          data-brand-ring="outer"
          className="absolute inset-0 rounded-full motion-safe:animate-[brand-ring-cw_2.4s_linear_infinite] motion-reduce:animate-none"
          style={{ backgroundImage: OUTER_RING_GRADIENT, WebkitMaskImage: OUTER_RING_MASK, maskImage: OUTER_RING_MASK }}
        />
        <span
          data-brand-ring="inner"
          className="absolute inset-[15%] rounded-full motion-safe:animate-[brand-ring-ccw_1.5s_linear_infinite] motion-reduce:animate-none"
          style={{ backgroundImage: INNER_RING_GRADIENT, WebkitMaskImage: INNER_RING_MASK, maskImage: INNER_RING_MASK }}
        />
        <span className="absolute inset-[25%] overflow-hidden rounded-full ring-1 ring-[var(--tpl-ring)]">
          <Image
            unoptimized
            src={logoUrl}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-contain p-[10%]"
          />
        </span>
      </div>
    </div>
  );
}
