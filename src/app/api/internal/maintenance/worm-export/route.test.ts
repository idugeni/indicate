import { describe, expect, it } from 'vitest';

import { authorized } from '@/app/api/internal/maintenance/worm-export/route';

function requestWith(auth: string | null): Request {
  const headers = new Headers();
  if (auth !== null) headers.set('authorization', auth);
  return new Request('https://indicate.website/api/internal/maintenance/worm-export', { headers });
}

describe('authorized worm-export', () => {
  it('menerima bearer yang persis sama', () => {
    expect(authorized(requestWith('Bearer rahasia-cron'), 'rahasia-cron')).toBe(true);
  });

  it('menolak header hilang, salah, dan beda panjang', () => {
    expect(authorized(requestWith(null), 'rahasia-cron')).toBe(false);
    expect(authorized(requestWith('Bearer salah'), 'rahasia-cron')).toBe(false);
    expect(authorized(requestWith('Bearer rahasia-cron-panjang'), 'rahasia-cron')).toBe(false);
  });
});
