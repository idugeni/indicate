import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { buildStructuredObjectKey, sanitizeMediaFilename } from '@/domain/stage4/object-key';
import { aggregateJobState, canonicalizePublicationOptions, isAllowedJobTransition, isAllowedTargetTransition, projectPublicationResult, retryDelaySeconds } from '@/domain/stage4/publication-policy';
import { mediaKeyReservations } from '@/infrastructure/db/schema';
import { InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';

describe('Stage 4 media and publication policies', () => {
  it('sanitizes filenames and generates exact owner-prefixed collision-safe keys', () => {
    expect(sanitizeMediaFilename('../../Berita Utama.JPG')).toBe('berita-utama.jpg');
    expect(buildStructuredObjectKey({ kind: 'article', articleId: 'article-1' }, '../Photo.PNG', '1234567890abcdef')).toBe('articles/article-1/photo-1234567890abcdef.png');
    expect(buildStructuredObjectKey({ kind: 'site', siteId: 'site-1' }, 'logo.webp', 'abcdef1234567890')).toMatch(/^sites\/site-1\//);
    expect(buildStructuredObjectKey({ kind: 'organization' }, 'asset', 'abcdef1234567890')).toMatch(/^assets\//);
  });
  it('canonicalizes nested publication options and enforces exact transitions', () => {
    expect(canonicalizePublicationOptions({ z: 1, a: { y: true, x: false } })).toBe('{"a":{"x":false,"y":true},"z":1}');
    expect(isAllowedJobTransition('queued', 'processing')).toBe(true); expect(isAllowedJobTransition('published', 'retrying')).toBe(false);
    expect(isAllowedTargetTransition('processing', 'published')).toBe(true); expect(isAllowedTargetTransition('queued', 'published')).toBe(false);
  });
  it('aggregates state, bounds retries, and projects exact terminal results', () => {
    expect(aggregateJobState(['published', 'processing'])).toBe('processing'); expect(aggregateJobState(['published', 'retrying'])).toBe('retrying'); expect(aggregateJobState(['published', 'failed'])).toBe('failed');
    expect(retryDelaySeconds({ maxAttempts: 3, delaysSeconds: [5, 30] }, 1)).toBe(5); expect(retryDelaySeconds({ maxAttempts: 3, delaysSeconds: [5, 30] }, 3)).toBeNull();
    expect(projectPublicationResult([{ state: 'published', publishedUrl: 'https://a.test/x' }, { state: 'failed', publishedUrl: null }])).toEqual({ finalState: 'failed', successfulCount: 1, urls: ['https://a.test/x'] });
  });
  it('keeps the Drizzle reservation owner-prefix constraint in parity with migration 0006', () => {
    expect(getTableConfig(mediaKeyReservations).checks.map(({ name }) => name)).toContain('media_key_reservation_owner_prefix');
  });
  it('uses exact-key-only deterministic provider fakes and tenant-namespaced mirrors', async () => {
    const storage = new InMemoryObjectStorage(); storage.putObject({ key: 'assets/a.jpg', contentType: 'image/jpeg', contentLength: 10, checksum: 'sum' });
    await expect(storage.headExact('assets/a.jpg')).resolves.toMatchObject({ key: 'assets/a.jpg' }); await expect(storage.headExact('assets/')).resolves.toBeNull();
    const queue = new InMemoryRedisCoordination(); await queue.schedule('org:job', new Date(0)); const claims = await queue.claimDue(new Date(1), 1, 10); expect(claims).toHaveLength(1); const reclaimed = await queue.claimDue(new Date(10_002), 1, 10); expect(reclaimed.map(({ logicalId }) => logicalId)).toEqual(['org:job']); await queue.acknowledge(reclaimed[0]!); await queue.mirrorState('org', 'job', 'queued'); expect(queue.mirrors.get('org:job')).toBe('queued');
  });
});
