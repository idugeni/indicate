import { describe, expect, it } from 'vitest';

import { badgeStyle, RED_EDITORIAL } from '@/modules/site/components/network/templates/red-editorial/theme';

describe('RED_EDITORIAL', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(RED_EDITORIAL.primary).toBe('#b91c1c');
    expect(RED_EDITORIAL.primaryDark).toBe('#7f1212');
    expect(RED_EDITORIAL.primarySoft).toBe('#fbe3e3');
    expect(RED_EDITORIAL.maroon).toBe('#7f1d1d');
    expect(RED_EDITORIAL.cream).toBe('#fdf6ec');
    expect(RED_EDITORIAL.ink).toBe('#230d0d');
    expect(RED_EDITORIAL.muted).toBe('#705050');
    expect(RED_EDITORIAL.faint).toBe('#ac9393');
    expect(RED_EDITORIAL.canvas).toBe('#fffafa');
    expect(RED_EDITORIAL.card).toBe('#ffffff');
    expect(RED_EDITORIAL.ring).toBe('#ecd3d3');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#991b1b', backgroundColor: '#fee2e2' });
    expect(badgeStyle(1)).toEqual({ color: '#854d0e', backgroundColor: '#fef9c3' });
    expect(badgeStyle(2)).toEqual({ color: '#0f766e', backgroundColor: '#ccfbf1' });
    expect(badgeStyle(3)).toEqual({ color: '#4d7c0f', backgroundColor: '#ecfccb' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
