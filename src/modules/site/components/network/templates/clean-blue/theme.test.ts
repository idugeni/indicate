import { describe, expect, it } from 'vitest';

import { badgeStyle, CLEAN_BLUE } from '@/modules/site/components/network/templates/clean-blue/theme';

describe('CLEAN_BLUE', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(CLEAN_BLUE.primary).toBe('#1a5fd0');
    expect(CLEAN_BLUE.primaryDark).toBe('#155cb8');
    expect(CLEAN_BLUE.primarySoft).toBe('#e8f0fe');
    expect(CLEAN_BLUE.ink).toBe('#0f172a');
    expect(CLEAN_BLUE.muted).toBe('#475569');
    expect(CLEAN_BLUE.faint).toBe('#94a3b8');
    expect(CLEAN_BLUE.canvas).toBe('#f5f8fd');
    expect(CLEAN_BLUE.card).toBe('#ffffff');
    expect(CLEAN_BLUE.ring).toBe('#e2e8f0');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#15803d', backgroundColor: '#dcfce7' });
    expect(badgeStyle(1)).toEqual({ color: '#6d28d9', backgroundColor: '#ede9fe' });
    expect(badgeStyle(2)).toEqual({ color: '#c2410c', backgroundColor: '#ffedd5' });
    expect(badgeStyle(3)).toEqual({ color: '#1d4ed8', backgroundColor: '#dbeafe' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
