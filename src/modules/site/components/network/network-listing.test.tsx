// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { TemplateLoader } from '@/modules/site/components/network/network-listing';
import { TEMPLATE_IDS } from '@/modules/site/components/network/templates/listing-shared';
import { BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';
import { CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';
import { DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';
import { GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';
import { GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';
import { ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';
import { PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';
import { RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';
import { SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';
import { WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

// Kanvas tiap template dipakai sebagai sidik jari cabang: tanpa ini, test hanya
// membuktikan "sesuatu render" dan akan tetap hijau bila semua cabang mengembalikan
// loader yang sama.
const CANVAS: Record<string, string> = {
  'black-lime': BLACK_LIME.canvas,
  'clean-blue': CLEAN_BLUE.canvas,
  'dark-navy': DARK_NAVY.canvas,
  'glassy-blue': GLASSY_BLUE.canvas,
  'green-minimal': GREEN_MINIMAL.canvas,
  'orange-modern': ORANGE_MODERN.canvas,
  'purple-editorial': PURPLE_EDITORIAL.canvas,
  'red-editorial': RED_EDITORIAL.canvas,
  'soft-blue': SOFT_BLUE.canvas,
  'warm-editorial': WARM_EDITORIAL.canvas,
};

function statusStyle(container: HTMLElement): string {
  return container.querySelector<HTMLElement>('[role="status"]')?.getAttribute('style') ?? '';
}

afterEach(() => {
  cleanup();
});

describe('TemplateLoader', () => {
  it('memetakan seluruh id template terdaftar ke palet yang bisa diuji', () => {
    expect(Object.keys(CANVAS).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  for (const templateId of TEMPLATE_IDS) {
    it(`merender status sibuk tanpa teks terlihat untuk ${templateId}`, () => {
      render(<TemplateLoader templateId={templateId} />);
      const status = screen.getByRole('status');

      expect(status.getAttribute('aria-busy')).toBe('true');
      expect(status.textContent).toBe('');
    });

    it(`memakai palet ${templateId} sendiri, bukan loader lain`, () => {
      const { container } = render(<TemplateLoader templateId={templateId} />);

      expect(statusStyle(container)).toContain(`--tpl-canvas: ${CANVAS[templateId]}`);
    });

    it(`merender orbit yang sama untuk ${templateId}, hanya warnanya yang dibedakan`, () => {
      const { container } = render(<TemplateLoader templateId={templateId} />);

      expect(container.querySelector('[data-brand-orbit="track"]')).toBeTruthy();
      expect(container.querySelector('[data-brand-orbit="dot"]')).toBeTruthy();
    });
  }

  it('tidak memuat gambar logo tenant sama sekali', () => {
    // Logo tenant praktis selalu wordmark persegi panjang di dalam kanvas
    // persegi, jadi di dalam lingkaran ia terbaca sebagai kotak gelap.
    const { container } = render(<TemplateLoader templateId="dark-navy" />);

    expect(container.querySelector('img')).toBeNull();
  });

  it('tidak melempar untuk id asing dan turun ke palet Clean Blue', () => {
    expect(() => render(<TemplateLoader templateId="template-hantu-999" />)).not.toThrow();

    expect(screen.getByRole('status')).toBeDefined();
    expect(statusStyle(document.body)).toContain(`--tpl-canvas: ${CLEAN_BLUE.canvas}`);
  });

  it('tidak melempar saat templateId kosong atau bukan string', () => {
    for (const templateId of [undefined, null, '', 42, true, {}, [], () => 'clean-blue']) {
      cleanup();
      expect(() => render(<TemplateLoader templateId={templateId} />)).not.toThrow();
      expect(screen.getByRole('status')).toBeDefined();
    }
  });

  it('tetap memakai palet Clean Blue untuk setiap nilai tak dikenal', () => {
    for (const templateId of [undefined, null, 'Clean-Blue', 'clean_blue', 7, {}]) {
      cleanup();
      const { container } = render(<TemplateLoader templateId={templateId} />);

      expect(statusStyle(container)).toContain(`--tpl-canvas: ${CLEAN_BLUE.canvas}`);
    }
  });
});