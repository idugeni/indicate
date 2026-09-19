import { describe, expect, it } from 'vitest';

import { badgeStyle, WARM_EDITORIAL } from '@/modules/site/components/network/templates/warm-editorial/theme';

describe('WARM_EDITORIAL', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(WARM_EDITORIAL.primary).toBe('#b4532a');
    expect(WARM_EDITORIAL.primaryDark).toBe('#8a3c1d');
    expect(WARM_EDITORIAL.primarySoft).toBe('#fae7d7');
    expect(WARM_EDITORIAL.ink).toBe('#231208');
    expect(WARM_EDITORIAL.muted).toBe('#6f5a4c');
    expect(WARM_EDITORIAL.faint).toBe('#ab9787');
    expect(WARM_EDITORIAL.canvas).toBe('#fdf7f0');
    expect(WARM_EDITORIAL.card).toBe('#ffffff');
    expect(WARM_EDITORIAL.ring).toBe('#e9d5c0');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#9a3412', backgroundColor: '#ffedd5' });
    expect(badgeStyle(1)).toEqual({ color: '#166534', backgroundColor: '#dcfce7' });
    expect(badgeStyle(2)).toEqual({ color: '#854d0e', backgroundColor: '#fef9c3' });
    expect(badgeStyle(3)).toEqual({ color: '#0e7490', backgroundColor: '#cffafe' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
