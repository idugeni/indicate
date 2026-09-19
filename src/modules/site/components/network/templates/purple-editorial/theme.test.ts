import { describe, expect, it } from 'vitest';

import { badgeStyle, PURPLE_EDITORIAL } from '@/modules/site/components/network/templates/purple-editorial/theme';

describe('PURPLE_EDITORIAL', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(PURPLE_EDITORIAL.primary).toBe('#7c3aed');
    expect(PURPLE_EDITORIAL.primaryDark).toBe('#5f21d6');
    expect(PURPLE_EDITORIAL.primarySoft).toBe('#ede9fe');
    expect(PURPLE_EDITORIAL.ink).toBe('#1c1440');
    expect(PURPLE_EDITORIAL.muted).toBe('#5f5884');
    expect(PURPLE_EDITORIAL.faint).toBe('#9d94c2');
    expect(PURPLE_EDITORIAL.canvas).toBe('#f8f7ff');
    expect(PURPLE_EDITORIAL.card).toBe('#ffffff');
    expect(PURPLE_EDITORIAL.ring).toBe('#ddd3f8');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#6d28d9', backgroundColor: '#ede9fe' });
    expect(badgeStyle(1)).toEqual({ color: '#0e7490', backgroundColor: '#cffafe' });
    expect(badgeStyle(2)).toEqual({ color: '#be123c', backgroundColor: '#ffe4e6' });
    expect(badgeStyle(3)).toEqual({ color: '#4d7c0f', backgroundColor: '#ecfccb' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
