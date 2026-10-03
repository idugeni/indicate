// @vitest-environment jsdom
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

const LOGO = 'https://portal.example/logo.png';

function outer() {
  return document.querySelector<HTMLElement>('[data-brand-ring="outer"]');
}

function inner() {
  return document.querySelector<HTMLElement>('[data-brand-ring="inner"]');
}

describe('BrandedLoader', () => {
  it('menyemdakan status sibuk tanpa teks terlihat', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);
    const status = screen.getByRole('status', { name: 'Memuat' });

    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(status.textContent).toBe('');
    cleanup();
  });

  it('memakai nama aksesibel dari prop label', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} label="Memuat berita" />);

    expect(screen.getByRole('status', { name: 'Memuat berita' })).toBeTruthy();
    cleanup();
  });

  it('menampilkan logo tenant dalam lingkaran', () => {
    const { container } = render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);
    const img = container.querySelector('img');

    expect(img?.getAttribute('src')).toBe(LOGO);
    expect(img?.getAttribute('srcset')).toBeNull();
    const disc = img?.parentElement;
    expect(disc?.getAttribute('class')).toMatch(/rounded-full/);
    expect(disc?.getAttribute('class')).toMatch(/overflow-hidden/);
    expect(img?.getAttribute('class')).toMatch(/object-contain/);
    cleanup();
  });

  it('memutar dua cincin berlawanan arah dengan durasi berbeda', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);
    const luar = outer();
    const dalam = inner();

    expect(luar?.getAttribute('class')).toMatch(/motion-safe:animate-\[brand-ring-cw_2\.4s_linear_infinite\]/);
    expect(dalam?.getAttribute('class')).toMatch(/motion-safe:animate-\[brand-ring-ccw_1\.5s_linear_infinite\]/);
    expect(luar?.getAttribute('style')).toContain('conic-gradient');
    expect(dalam?.getAttribute('style')).toContain('conic-gradient');
    expect(luar?.getAttribute('style')).not.toBe(dalam?.getAttribute('style'));
    cleanup();
  });

  it('menarik warna cincin dari variabel tema, bukan hex langsung', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);

    for (const cincin of [outer(), inner()]) {
      const style = cincin?.getAttribute('style') ?? '';
      expect(style).toContain('var(--tpl-primary)');
      expect(style).toMatch(/color-mix\(in srgb, var\(--tpl-primary\)/);
      expect(style).not.toMatch(/#[0-9a-f]{3,8}/i);
    }
    cleanup();
  });

  it('menggunakan kanvas tema sebagai latar overlay', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);
    const status = screen.getByRole('status');

    expect(status.getAttribute('style')).toContain(`--tpl-canvas: ${THEME.canvas}`);
    expect(status.getAttribute('style')).toContain(`--tpl-primary: ${THEME.primary}`);
    expect(status.getAttribute('class')).toContain('bg-[var(--tpl-canvas)]');
    expect(status.getAttribute('class')).toContain('fixed');
    expect(status.getAttribute('class')).toContain('inset-0');
    expect(status.getAttribute('class')).toContain('z-[100]');
    cleanup();
  });

  it('berhenti total dan tetap terbaca utuh saat reduced motion', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);

    for (const cincin of [outer(), inner()]) {
      const className = cincin?.getAttribute('class') ?? '';
      expect(className).toMatch(/motion-reduce:animate-none/);
      expect(className).not.toMatch(/motion-reduce:animate-\[/);
    }
    // Gradien menutup 360° penuh dengan kaki transparan, bukan busur terbuka,
    // sehingga keadaan diam tetap berupa dua cincin utuh.
    const gradient = outer()?.getAttribute('style') ?? '';
    expect(gradient).toContain('0deg');
    expect(gradient).toContain('360deg');
    cleanup();
  });

  it('menyesuaikan ukuran cincin dan logo terhadap viewport', () => {
    render(<BrandedLoader theme={THEME} logoUrl={LOGO} />);
    const poros = screen.getByRole('status').firstElementChild;

    expect(poros?.getAttribute('class')).toContain('h-[min(9rem,34vmin)]');
    expect(poros?.getAttribute('class')).toContain('w-[min(9rem,34vmin)]');
    expect(outer()?.getAttribute('class')).toContain('inset-0');
    expect(inner()?.getAttribute('class')).toContain('inset-[15%]');
    cleanup();
  });
});
