import { describe, expect, it } from 'vitest';

import { TEMPLATE_CANVAS_FALLBACK, overlayForTemplate } from '@/modules/site/components/template-memory';

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
