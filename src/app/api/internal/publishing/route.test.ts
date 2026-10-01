import { describe, expect, it } from 'vitest';

import { isReconcileDue, matchesSecret } from '@/app/api/internal/publishing/route';

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

describe('isReconcileDue', () => {
  it('jatuh tiap menit kelipatan lima UTC', () => {
    expect(isReconcileDue(new Date('2026-10-02T10:00:00.000Z'))).toBe(true);
    expect(isReconcileDue(new Date('2026-10-02T10:05:00.000Z'))).toBe(true);
    expect(isReconcileDue(new Date('2026-10-02T10:03:00.000Z'))).toBe(false);
    expect(isReconcileDue(new Date('2026-10-02T10:59:00.000Z'))).toBe(false);
  });
});
