import { describe, expect, it } from 'vitest';

import { TEMPLATE_CANVAS_FALLBACK, chromeForTemplate, overlayForTemplate } from '@/modules/site/components/template-memory';

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
  it('mewarnai chrome peramban gelap untuk template gelap', () => {
    expect(chromeForTemplate('dark-navy')).toEqual({ themeColor: '#070f22', colorScheme: 'dark' });
    expect(chromeForTemplate('black-lime')).toEqual({ themeColor: '#0a0c07', colorScheme: 'dark' });
  });

  it('membiarkan default terang untuk setiap template terang', () => {
    for (const id of ['clean-blue', 'glassy-blue', 'green-minimal', 'orange-modern', 'purple-editorial', 'red-editorial', 'soft-blue', 'warm-editorial']) {
      expect(chromeForTemplate(id)).toBeNull();
    }
  });

  it('mengabaikan nilai kosong atau tak dikenal', () => {
    expect(chromeForTemplate(null)).toBeNull();
    expect(chromeForTemplate('')).toBeNull();
    expect(chromeForTemplate('https://evil.test')).toBeNull();
  });
});
