import { describe, expect, it } from 'vitest';

import {
  aggregateJobState,
  canonicalPublicationPayload,
  canonicalizePublicationOptions,
  hasCurrentFence,
  isAllowedTargetTransition,
  projectPublicationResult,
  publicationFingerprint,
  retryDelaySeconds,
  seedInitialViewCount,
} from '@/modules/publishing/publication-policy';

describe('canonicalizePublicationOptions', () => {
  it('mengurutkan key objek secara rekursif agar stabil', () => {
    expect(canonicalizePublicationOptions({ b: 1, a: { d: 4, c: 3 } })).toBe('{"a":{"c":3,"d":4},"b":1}');
  });
});

describe('canonicalPublicationPayload', () => {
  const base = { organizationId: 'org-1', articleId: 'art-1', siteIds: ['s-b', 's-a', 's-a'], options: {} };

  it('mengurutkan siteIds dan menghilangkan override kosong', () => {
    const payload = JSON.parse(canonicalPublicationPayload(base)) as { siteIds: string[]; overrides?: unknown };
    expect(payload.siteIds).toEqual(['s-a', 's-b']);
    expect('overrides' in payload).toBe(false);
  });

  it('menghasilkan fingerprint stabil berversi', async () => {
    const first = await publicationFingerprint(base);
    const second = await publicationFingerprint({ ...base, siteIds: ['s-a', 's-b'] });
    expect(first).toBe(second);
    expect(first.startsWith('v2:')).toBe(true);
    const changed = await publicationFingerprint({ ...base, articleId: 'art-2' });
    expect(changed).not.toBe(first);
    const rescheduled = await publicationFingerprint({ ...base, publishAt: '2026-09-23T10:00:00.000Z' });
    expect(rescheduled).not.toBe(first);
  });
});

describe('isAllowedTargetTransition', () => {
  it('mengizinkan queued ke processing dan menolak lompatan', () => {
    expect(isAllowedTargetTransition('queued', 'processing')).toBe(true);
    expect(isAllowedTargetTransition('queued', 'published')).toBe(false);
    expect(isAllowedTargetTransition('published', 'unpublished')).toBe(true);
    expect(isAllowedTargetTransition('failed', 'processing')).toBe(false);
  });
});

describe('aggregateJobState', () => {
  it('melempar untuk daftar kosong', () => {
    expect(() => aggregateJobState([])).toThrow();
  });

  it('memprioritaskan processing lalu retrying', () => {
    expect(aggregateJobState(['queued', 'processing', 'published'])).toBe('processing');
    expect(aggregateJobState(['queued', 'retrying'])).toBe('retrying');
  });

  it('memproyeksikan status terminal', () => {
    expect(aggregateJobState(['published', 'published'])).toBe('published');
    expect(aggregateJobState(['published', 'failed'])).toBe('failed');
    expect(aggregateJobState(['published', 'unpublished'])).toBe('unpublished');
    expect(aggregateJobState(['queued', 'queued'])).toBe('queued');
  });
});

describe('retryDelaySeconds', () => {
  const policy = { maxAttempts: 3, delaysSeconds: [30, 120] };

  it('mengembalikan null di luar jendela percobaan', () => {
    expect(retryDelaySeconds(policy, 0)).toBe(null);
    expect(retryDelaySeconds(policy, 3)).toBe(null);
  });

  it('memakai delay terakhir saat indeks melampaui daftar', () => {
    expect(retryDelaySeconds(policy, 1)).toBe(30);
    expect(retryDelaySeconds(policy, 2)).toBe(120);
  });
});

describe('projectPublicationResult', () => {
  it('memproyeksikan url terbit terurut dan hitungan sukses', () => {
    const result = projectPublicationResult([
      { state: 'published', publishedUrl: 'https://b.example/x' },
      { state: 'published', publishedUrl: 'https://a.example/x' },
    ]);
    expect(result.finalState).toBe('published');
    expect(result.successfulCount).toBe(2);
    expect(result.urls).toEqual(['https://a.example/x', 'https://b.example/x']);
  });

  it('melempar untuk target non-terminal', () => {
    expect(() => projectPublicationResult([{ state: 'queued', publishedUrl: null }])).toThrow();
  });
});

describe('seedInitialViewCount and hasCurrentFence', () => {
  it('hanya seeding pada publikasi perdana dengan view nol', () => {
    const seeded = seedInitialViewCount(0, false);
    expect(seeded !== null && seeded >= 1_000 && seeded <= 12_000 && seeded % 10 !== 0).toBe(true);
    expect(seedInitialViewCount(5, false)).toBe(null);
    expect(seedInitialViewCount(0, true)).toBe(null);
  });

  it('membandingkan fencing token secara ketat', () => {
    expect(hasCurrentFence(3, 3)).toBe(true);
    expect(hasCurrentFence(3, 4)).toBe(false);
  });
});
