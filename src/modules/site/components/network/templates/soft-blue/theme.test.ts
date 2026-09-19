import { describe, expect, it } from 'vitest';

import { badgeStyle, SOFT_BLUE } from '@/modules/site/components/network/templates/soft-blue/theme';

describe('SOFT_BLUE', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(SOFT_BLUE.primary).toBe('#2563eb');
    expect(SOFT_BLUE.primaryDark).toBe('#1d4ed8');
    expect(SOFT_BLUE.primarySoft).toBe('#dbeafe');
    expect(SOFT_BLUE.ink).toBe('#0e1b33');
    expect(SOFT_BLUE.muted).toBe('#51617a');
    expect(SOFT_BLUE.faint).toBe('#93a3c0');
    expect(SOFT_BLUE.canvas).toBe('#f1f6ff');
    expect(SOFT_BLUE.card).toBe('#ffffff');
    expect(SOFT_BLUE.ring).toBe('#d3e2fb');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#1d4ed8', backgroundColor: '#dbeafe' });
    expect(badgeStyle(1)).toEqual({ color: '#047857', backgroundColor: '#d1fae5' });
    expect(badgeStyle(2)).toEqual({ color: '#7c3aed', backgroundColor: '#ede9fe' });
    expect(badgeStyle(3)).toEqual({ color: '#c2410c', backgroundColor: '#ffedd5' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
