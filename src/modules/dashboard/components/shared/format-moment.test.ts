import { describe, expect, it } from 'vitest';

import { formatMoment } from '@/modules/dashboard/components/shared/format-moment';

describe('formatMoment', () => {
  it('memformat stempel waktu ISO menjadi tanggal panjang Indonesia', () => {
    expect(formatMoment('2026-09-18T14:00:00.000Z')).toContain('18 Sep 2026');
  });

  it('memisahkan tanggal dan jam pada hasil format', () => {
    expect(formatMoment('2026-09-18T14:00:00.000Z')).toMatch(/^18 Sep 2026, \d{2}\.\d{2}$/);
  });

  it('mengembalikan null saat momen tidak pernah tercatat', () => {
    expect(formatMoment(null)).toBeNull();
    expect(formatMoment(undefined)).toBeNull();
  });

  it('mengembalikan null alih-alih mengulang nilai tak terbaca', () => {
    expect(formatMoment('bukan tanggal')).toBeNull();
    expect(formatMoment('')).toBeNull();
  });
});
