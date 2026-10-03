// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { BrandedLoader } from '@/modules/site/components/network/ui/branded-loader';
import type { TemplateTheme } from '@/modules/site/components/network/ui/template-theme';

const THEME: TemplateTheme = {
  primary: '#1a5fd0',
  primaryDark: '#155cb8',
  primarySoft: '#e8f0fe',
  ink: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  canvas: '#f5f8fd',
  card: '#ffffff',
  ring: '#e2e8f0',
  scheme: 'light',
};

const GLOBAL_CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

/** Indeks deklarasi layer sungguhan, bukan penyebutan di dalam komentar. */
const BASE_LAYER = GLOBAL_CSS.indexOf('@layer base {');
const COMPONENTS_LAYER = GLOBAL_CSS.indexOf('@layer components {');

function track() {
  return document.querySelector<HTMLElement>('[data-brand-orbit="track"]');
}

function dot() {
  return document.querySelector<HTMLElement>('[data-brand-orbit="dot"]');
}

/**
 * Isolate satu blok deklarasi di `@layer components`.
 *
 * Wajib di-scope ke layer itu: nama yang sama juga dipakai override
 * `prefers-reduced-motion` di `@layer base`, dan pencarian polos akan
 * mengambil yang lebih dulu — yaitu override, bukan geometri aslinya.
 */
function rule(selector: string): string {
  const start = GLOBAL_CSS.indexOf(`${selector} {`, COMPONENTS_LAYER);
  expect(start, `${selector} tidak ada di @layer components`).toBeGreaterThan(-1);
  return GLOBAL_CSS.slice(start, GLOBAL_CSS.indexOf('}', start));
}

describe('BrandedLoader', () => {
  it('menyemdakan status sibuk tanpa teks terlihat', () => {
    render(<BrandedLoader theme={THEME} />);
    const status = screen.getByRole('status', { name: 'Memuat' });

    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toBe('');
    cleanup();
  });

  it('memakai nama aksesibel dari prop label', () => {
    render(<BrandedLoader theme={THEME} label="Memuat berita" />);

    expect(screen.getByRole('status', { name: 'Memuat berita' })).toBeTruthy();
    cleanup();
  });

  it('tidak memuat gambar logo tenant', () => {
    // Logo yang diunggah tenant praktis selalu wordmark persegi panjang di dalam
    // kanvas persegi; di dalam lingkaran ia terbaca sebagai kotak gelap.
    const { container } = render(<BrandedLoader theme={THEME} />);

    expect(container.querySelector('img')).toBeNull();
    cleanup();
  });

  it('merender track dan titik berputar sebagai dua elemen terpisah', () => {
    render(<BrandedLoader theme={THEME} />);

    expect(track()?.getAttribute('class')).toContain('brand-orbit-track');
    expect(dot()?.getAttribute('class')).toContain('brand-orbit');
    // Geometri dan kebijakan gerak tinggal di globals.css.
    expect(track()?.getAttribute('style')).toBeNull();
    expect(dot()?.getAttribute('style')).toBeNull();
    cleanup();
  });

  it('memutar track dan denyut dengan dua keyframe berbeda', () => {
    expect(rule('.brand-orbit')).toMatch(/animation:\s*brand-orbit-spin\s+1\.6s/);
    expect(rule('.brand-orbit-track')).toMatch(/animation:\s*brand-orbit-pulse\s+2\.4s/);
    expect(GLOBAL_CSS).toContain('@keyframes brand-orbit-spin');
    expect(GLOBAL_CSS).toContain('@keyframes brand-orbit-pulse');
  });

  it('menarik warna indikator dari variabel tema, bukan hex langsung', () => {
    // The dot is painted on `.brand-orbit::after`, so the colour lives there,
    // not on `.brand-orbit` itself.
    const track = rule('.brand-orbit-track');
    expect(track).toContain('var(--tpl-primary)');
    expect(track).not.toMatch(/#[0-9a-f]{3,8}/i);

    const after = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf('.brand-orbit::after'));
    const block = after.slice(0, after.indexOf('}'));
    expect(block).toContain('background: var(--tpl-primary)');
    expect(block).not.toMatch(/#[0-9a-f]{3,8}/i);
  });

  it('menempakkan titik di tepi track agar mengorbit, bukan berputar di pusat', () => {
    // `inset: 4%` + rotate pada elemen yang sama memutar titik pada radius track.
    expect(rule('.brand-orbit')).toContain('inset: 4%');
    expect(rule('.brand-orbit-track')).toContain('inset: 4%');
    // Titik rides pada ::after yang dipin ke tepi atas, jadi satu transform
    // cukup — tanpa elemen kedua yang beranimasi.
    const after = GLOBAL_CSS.slice(GLOBAL_CSS.indexOf('.brand-orbit::after'));
    expect(after).toMatch(/\.brand-orbit::after \{[^}]*top:/);
    expect(after).toMatch(/border-radius: 9999px/);
  });

  it('tidak memakai filter atau gradient yang mahal', () => {
    // `filter: blur()` di tiap frame adalah biaya nyata di HP kelas bawah.
    for (const selector of ['.brand-orbit-track', '.brand-orbit', '.brand-orbit::after']) {
      const start = selector === '.brand-orbit::after'
        ? GLOBAL_CSS.indexOf('.brand-orbit::after')
        : GLOBAL_CSS.indexOf(`${selector} {`, COMPONENTS_LAYER);
      const block = GLOBAL_CSS.slice(start, GLOBAL_CSS.indexOf('}', start));
      expect(block).not.toMatch(/filter:/);
      expect(block).not.toMatch(/conic-gradient/);
      expect(block).not.toMatch(/mask-image/);
    }
  });

  it('melanjutkan putaran lambat saat reduced motion, bukan membekukan indikator', () => {
    const slowSpin = GLOBAL_CSS.indexOf('.brand-orbit { animation: brand-orbit-spin 13s');
    const slowPulse = GLOBAL_CSS.indexOf('.brand-orbit-track { animation: brand-orbit-pulse 8s');

    expect(slowSpin).toBeGreaterThan(-1);
    expect(slowPulse).toBeGreaterThan(-1);
    // WAJIB di @layer base: `!important` membalik urutan cascade layer, jadi
    // deklarasi yang sama di @layer components kalah oleh aturan global `*`
    // dan indikator tetap beku di 0.01s / 1 iterasi.
    expect(BASE_LAYER).toBeLessThan(slowSpin);
    expect(slowSpin).toBeLessThan(COMPONENTS_LAYER);
    // Tidak boleh mematikan animasi indikator sama sekali.
    expect(rule('.brand-orbit')).not.toMatch(/animation:\s*none/);
    expect(rule('.brand-orbit-track')).not.toMatch(/animation:\s*none/);
  });

  it('menggunakan kanvas tema sebagai latar overlay', () => {
    render(<BrandedLoader theme={THEME} />);
    const status = screen.getByRole('status');

    expect(status.getAttribute('style')).toContain(`--tpl-canvas: ${THEME.canvas}`);
    expect(status.getAttribute('style')).toContain(`--tpl-primary: ${THEME.primary}`);
    expect(status.getAttribute('class')).toContain('bg-[var(--tpl-canvas)]');
    expect(status.getAttribute('class')).toContain('fixed');
    expect(status.getAttribute('class')).toContain('inset-0');
    expect(status.getAttribute('class')).toContain('z-[100]');
    cleanup();
  });

  it('menyesuaikan ukuran poros indikator terhadap viewport', () => {
    render(<BrandedLoader theme={THEME} />);
    const poros = screen.getByRole('status').firstElementChild;

    expect(poros?.getAttribute('class')).toContain('h-[min(9rem,34vmin)]');
    expect(poros?.getAttribute('class')).toContain('w-[min(9rem,34vmin)]');
    cleanup();
  });
});
