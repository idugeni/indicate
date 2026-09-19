import { describe, expect, it } from 'vitest';

import { badgeStyle, DARK_NAVY } from '@/modules/site/components/network/templates/dark-navy/theme';

describe('DARK_NAVY', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(DARK_NAVY.primary).toBe('#2f7bff');
    expect(DARK_NAVY.primaryDark).toBe('#1a5fd0');
    expect(DARK_NAVY.primarySoft).toBe('#14294f');
    expect(DARK_NAVY.ink).toBe('#eaf0fb');
    expect(DARK_NAVY.muted).toBe('#9aa9c4');
    expect(DARK_NAVY.faint).toBe('#5f6f8c');
    expect(DARK_NAVY.canvas).toBe('#070f22');
    expect(DARK_NAVY.card).toBe('#0e1a33');
    expect(DARK_NAVY.ring).toBe('#1b2c4f');
  });
});

describe('badgeStyle', () => {
  it('memetakan empat indeks pertama ke gaya berbeda', () => {
    expect(badgeStyle(0)).toEqual({ color: '#bfdbfe', backgroundColor: '#172554' });
    expect(badgeStyle(1)).toEqual({ color: '#ddd6fe', backgroundColor: '#2e1065' });
    expect(badgeStyle(2)).toEqual({ color: '#fed7aa', backgroundColor: '#431407' });
    expect(badgeStyle(3)).toEqual({ color: '#a5f3fc', backgroundColor: '#083344' });
  });

  it('memutar gaya badge melewati batas daftar', () => {
    expect(badgeStyle(4)).toEqual(badgeStyle(0));
    expect(badgeStyle(7)).toEqual(badgeStyle(3));
    expect(badgeStyle(9)).toEqual(badgeStyle(1));
  });
});
