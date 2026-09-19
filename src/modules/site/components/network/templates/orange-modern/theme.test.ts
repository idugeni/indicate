import { describe, expect, it } from 'vitest';

import { badgeStyle, ORANGE_MODERN } from '@/modules/site/components/network/templates/orange-modern/theme';

describe('ORANGE_MODERN', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(ORANGE_MODERN.primary).toBe('#ea580c');
    expect(ORANGE_MODERN.primaryDark).toBe('#c2410c');
    expect(ORANGE_MODERN.primarySoft).toBe('#ffedd5');
    expect(ORANGE_MODERN.ink).toBe('#220f04');
    expect(ORANGE_MODERN.muted).toBe('#71564a');
    expect(ORANGE_MODERN.faint).toBe('#a8988b');
    expect(ORANGE_MODERN.canvas).toBe('#fff9f4');
    expect(ORANGE_MODERN.card).toBe('#ffffff');
    expect(ORANGE_MODERN.ring).toBe('#f2dcc9');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#c2410c', backgroundColor: '#ffedd5' });
    expect(badgeStyle(1)).toEqual({ color: '#0e7490', backgroundColor: '#cffafe' });
    expect(badgeStyle(2)).toEqual({ color: '#4d7c0f', backgroundColor: '#ecfccb' });
    expect(badgeStyle(3)).toEqual({ color: '#7c2d12', backgroundColor: '#ffedd5' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
