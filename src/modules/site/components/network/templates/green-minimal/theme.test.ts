import { describe, expect, it } from 'vitest';

import { badgeStyle, GREEN_MINIMAL } from '@/modules/site/components/network/templates/green-minimal/theme';

describe('GREEN_MINIMAL', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(GREEN_MINIMAL.primary).toBe('#1d7a38');
    expect(GREEN_MINIMAL.primaryDark).toBe('#145c2a');
    expect(GREEN_MINIMAL.primarySoft).toBe('#e0f0e5');
    expect(GREEN_MINIMAL.ink).toBe('#10231a');
    expect(GREEN_MINIMAL.muted).toBe('#4d6356');
    expect(GREEN_MINIMAL.faint).toBe('#93a89b');
    expect(GREEN_MINIMAL.canvas).toBe('#f7faf7');
    expect(GREEN_MINIMAL.card).toBe('#ffffff');
    expect(GREEN_MINIMAL.ring).toBe('#d9e7de');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#166534', backgroundColor: '#dcfce7' });
    expect(badgeStyle(1)).toEqual({ color: '#854d0e', backgroundColor: '#fef9c3' });
    expect(badgeStyle(2)).toEqual({ color: '#0e7490', backgroundColor: '#cffafe' });
    expect(badgeStyle(3)).toEqual({ color: '#4d7c0f', backgroundColor: '#ecfccb' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
