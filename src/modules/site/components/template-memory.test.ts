import { describe, expect, it } from 'vitest';

import {
  TEMPLATE_CANVAS_FALLBACK,
  chromeForTemplate,
  overlayForTemplate,
} from '@/modules/site/components/template-memory';

describe('overlayForTemplate', () => {
  it('memetakan template gelap ke canvas gelap', () => {
    expect(overlayForTemplate('dark-navy')).toBe('#070f22');
    expect(overlayForTemplate('black-lime')).toBe('#0a0c07');
  });

  it('memetakan template terang ke canvas terang', () => {
    expect(overlayForTemplate('soft-blue')).toBe('#f1f6ff');
    expect(overlayForTemplate('red-editorial')).toBe('#fffafa');
  });

  it('jatuh ke netral untuk nilai tak dikenal', () => {
    expect(overlayForTemplate(null)).toBe(TEMPLATE_CANVAS_FALLBACK);
    expect(overlayForTemplate('')).toBe(TEMPLATE_CANVAS_FALLBACK);
    expect(overlayForTemplate('https://evil.test')).toBe(TEMPLATE_CANVAS_FALLBACK);
  });
});

describe('chromeForTemplate', () => {
  it('memetakan warna chrome dan skema gelap untuk template gelap', () => {
    expect(chromeForTemplate('dark-navy')).toEqual({
      themeColor: '#070f22',
      colorScheme: 'dark',
    });
    expect(chromeForTemplate('black-lime')).toEqual({
      themeColor: '#0a0c07',
      colorScheme: 'dark',
    });
  });

  it('memetakan warna chrome dan skema terang untuk semua template terang', () => {
    const lightTemplates = {
      'clean-blue': '#f5f8fd',
      'glassy-blue': '#edf4ff',
      'green-minimal': '#f7faf7',
      'orange-modern': '#fff9f4',
      'purple-editorial': '#f8f7ff',
      'red-editorial': '#fffafa',
      'soft-blue': '#f1f6ff',
      'warm-editorial': '#fdf7f0',
    } as const;

    for (const [templateId, themeColor] of Object.entries(lightTemplates)) {
      expect(chromeForTemplate(templateId)).toEqual({
        themeColor,
        colorScheme: 'light',
      });
    }
  });

  it('mengabaikan nilai kosong atau tak dikenal', () => {
    expect(chromeForTemplate(null)).toBeNull();
    expect(chromeForTemplate('')).toBeNull();
    expect(chromeForTemplate('https://evil.test')).toBeNull();
  });
});
