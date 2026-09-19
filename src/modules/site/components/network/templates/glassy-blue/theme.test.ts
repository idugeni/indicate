import { describe, expect, it } from 'vitest';

import { badgeStyle, GLASSY_BLUE } from '@/modules/site/components/network/templates/glassy-blue/theme';

describe('GLASSY_BLUE', () => {
  it('menyediakan palet mandiri lengkap', () => {
    expect(GLASSY_BLUE.primary).toBe('#1f7cff');
    expect(GLASSY_BLUE.primaryDark).toBe('#155fd0');
    expect(GLASSY_BLUE.primarySoft).toBe('#e3efff');
    expect(GLASSY_BLUE.ink).toBe('#0e1b33');
    expect(GLASSY_BLUE.muted).toBe('#51617a');
    expect(GLASSY_BLUE.faint).toBe('#93a3c0');
    expect(GLASSY_BLUE.canvas).toBe('#edf4ff');
    expect(GLASSY_BLUE.card).toBe('#ffffff');
    expect(GLASSY_BLUE.ring).toBe('#d6e5fb');
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
