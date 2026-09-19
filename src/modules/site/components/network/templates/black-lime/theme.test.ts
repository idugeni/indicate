import { describe, expect, it } from 'vitest';

import { badgeStyle, BLACK_LIME } from '@/modules/site/components/network/templates/black-lime/theme';

describe('BLACK_LIME', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(BLACK_LIME.primary).toBe('#c5f82a');
    expect(BLACK_LIME.primaryDark).toBe('#9ecb14');
    expect(BLACK_LIME.primarySoft).toBe('#22300a');
    expect(BLACK_LIME.ink).toBe('#f2f5e9');
    expect(BLACK_LIME.muted).toBe('#a3ad9a');
    expect(BLACK_LIME.faint).toBe('#646b5e');
    expect(BLACK_LIME.canvas).toBe('#0a0c07');
    expect(BLACK_LIME.card).toBe('#131711');
    expect(BLACK_LIME.ring).toBe('#242b1f');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#d9f99d', backgroundColor: '#1a2e05' });
    expect(badgeStyle(1)).toEqual({ color: '#e9d5ff', backgroundColor: '#3b0764' });
    expect(badgeStyle(2)).toEqual({ color: '#fed7aa', backgroundColor: '#431407' });
    expect(badgeStyle(3)).toEqual({ color: '#bfdbfe', backgroundColor: '#172554' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
