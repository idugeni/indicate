import { describe, expect, it } from 'vitest';

import { matchesSecret } from '@/app/api/internal/publishing/route';

describe('matchesSecret', () => {
  it('menerima bearer yang persis sama', () => {
    expect(matchesSecret('Bearer rahasia-cron', 'rahasia-cron')).toBe(true);
  });

  it('menolak null, skema lain, dan beda isi', () => {
    expect(matchesSecret(null, 'rahasia-cron')).toBe(false);
    expect(matchesSecret('Basic cmFoYXNpYQ==', 'rahasia-cron')).toBe(false);
    expect(matchesSecret('Bearer salah', 'rahasia-cron')).toBe(false);
    expect(matchesSecret('Bearer rahasia-cron-panjang', 'rahasia-cron')).toBe(false);
  });
});
