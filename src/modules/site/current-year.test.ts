import { describe, expect, it, vi } from 'vitest';

import { cacheLife } from 'next/cache';
import { currentYear } from '@/modules/site/current-year';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));

describe('currentYear', () => {
  it('mengembalikan tahun kalender UTC berjalan', async () => {
    await expect(currentYear()).resolves.toBe(new Date().getUTCFullYear());
  });

  it('mendaftarkan profil cache harian', async () => {
    await currentYear();
    expect(vi.mocked(cacheLife)).toHaveBeenCalledWith('days');
  });
});
