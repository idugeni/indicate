import { describe, expect, it } from 'vitest';

import {
  formatRelative,
  formatDate,
  formatDateTime,
  presetRange,
} from '@/modules/dashboard/components/shared/dashboard-dates';

describe('Util tanggal dasbor', () => {
  it('memformat tanggal kalender Indonesia', () => {
    expect(formatDate('2026-09-18T14:00:00.000Z')).toBe('18 Sep 2026');
  });

  it('mengembalikan input tak valid apa adanya', () => {
    expect(formatDate('bukan-tanggal')).toBe('bukan-tanggal');
    expect(formatDateTime('bukan-tanggal')).toBe('bukan-tanggal');
    expect(formatRelative('bukan-tanggal')).toBe('bukan-tanggal');
  });

  it('memformat jarak relatif terhadap acuan', () => {
    const reference = new Date('2026-09-18T14:00:00.000Z');
    expect(formatRelative('2026-09-18T11:00:00.000Z', reference)).toContain('3 jam');
  });

  it('menghasilkan rentang preset yang konsisten', () => {
    const reference = new Date('2026-09-18T14:00:00.000Z');
    const today = presetRange('today', reference);
    expect(today.to).toBe(reference.toISOString());
    expect(today.from < today.to).toBe(true);
    const seven = presetRange('7-days', reference);
    const thirty = presetRange('30-days', reference);
    expect(seven.from > thirty.from).toBe(true);
  });
});
