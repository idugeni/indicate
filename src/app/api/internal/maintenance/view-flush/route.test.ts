import { describe, expect, it } from 'vitest';

import { authorized, collectPoppedDeltas } from '@/app/api/internal/maintenance/view-flush/route';

function requestWith(auth: string | null): Request {
  const headers = new Headers();
  if (auth !== null) headers.set('authorization', auth);
  return new Request('https://indicate.website/api/internal/maintenance/view-flush', { headers });
}

describe('authorized view-flush', () => {
  it('menerima bearer yang persis sama', () => {
    expect(authorized(requestWith('Bearer rahasia-cron'), 'rahasia-cron')).toBe(true);
  });

  it('menolak header hilang, salah, dan beda panjang', () => {
    expect(authorized(requestWith(null), 'rahasia-cron')).toBe(false);
    expect(authorized(requestWith('Bearer salah'), 'rahasia-cron')).toBe(false);
    expect(authorized(requestWith('Bearer rahasia-cron-panjang'), 'rahasia-cron')).toBe(false);
  });
});

describe('collectPoppedDeltas', () => {
  it('memetakan pasangan kunci-nilai hasil GETDEL menjadi delta per kunci', () => {
    const { deltas, invalidKeys } = collectPoppedDeltas([
      'pv:production:org-1:site-1:rel-1', '12',
      'pv:production:org-1:site-1:rel-2', '7',
    ]);
    expect(invalidKeys).toEqual([]);
    expect(deltas.get('pv:production:org-1:site-1:rel-1')).toMatchObject({
      organizationId: 'org-1',
      siteId: 'site-1',
      articleSiteId: 'rel-1',
      count: 12,
    });
    expect(deltas.get('pv:production:org-1:site-1:rel-2')?.count).toBe(7);
  });

  it('menjumlahkan kemunculan ganda kunci yang sama', () => {
    const { deltas, invalidKeys } = collectPoppedDeltas([
      'pv:production:org-1:site-1:rel-1', '5',
      'pv:production:org-1:site-1:rel-1', '9',
    ]);
    expect(invalidKeys).toEqual([]);
    expect(deltas.get('pv:production:org-1:site-1:rel-1')?.count).toBe(14);
  });

  it('menggolongkan kunci format asing dan hitungan tak valid sebagai invalid', () => {
    const { deltas, invalidKeys } = collectPoppedDeltas([
      'pv:production:org-1:site-1', '4',
      'other:production:org-1:site-1:rel-9', '4',
      'pv:production:org-1:site-1:rel-3', 'bukan-angka',
      'pv:production:org-1:site-1:rel-4', '0',
      'pv:production:org-1:site-1:rel-5', '-2',
    ]);
    expect(deltas.size).toBe(0);
    expect([...invalidKeys].sort()).toEqual([
      'other:production:org-1:site-1:rel-9',
      'pv:production:org-1:site-1',
      'pv:production:org-1:site-1:rel-3',
      'pv:production:org-1:site-1:rel-4',
      'pv:production:org-1:site-1:rel-5',
    ]);
  });
});
