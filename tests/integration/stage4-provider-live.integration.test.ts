import { describe, expect, it } from 'vitest';

import { UpstashPublicationQueueAdapter } from '@/infrastructure/redis/upstash-publication-queue';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { InMemoryObjectStorage, InMemoryRedisCoordination } from '@/infrastructure/testing/stage4-providers';

const hasR2 = ['R2_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every((name) => Boolean(process.env[name]));
const hasUpstash = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'UPSTASH_REDIS_RESOURCE_ID', 'REDIS_NAMESPACE'].every((name) => Boolean(process.env[name]));
const bytes = new TextEncoder().encode('stage4-provider-contract');
const checksum = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('base64');

describe('mandatory faithful Stage 4 provider contracts', () => {
  it('binds content type and SHA-256 to exact R2 PUT signatures without network credentials', async () => {
    const adapter = new R2ObjectStorageAdapter({ accountId: 'contract-account', bucketName: 'private-contract', accessKeyId: 'contract-key', secretAccessKey: 'contract-secret' });
    const authorization = await adapter.authorizeExactPut('assets/exact.txt', 'text/plain', checksum, 60);
    expect(authorization.requiredHeaders).toEqual({ 'content-type': 'text/plain', 'x-amz-checksum-sha256': checksum });
    const signed = new URL(authorization.url);
    expect(signed.searchParams.get('X-Amz-SignedHeaders')).toContain('x-amz-checksum-sha256');
    expect(decodeURIComponent(signed.pathname)).toBe('/assets/exact.txt');
    expect(signed.hostname).toContain('private-contract');
  });

  it('faithfully enforces one-shot checksum-bound PUT, SHA-256 HEAD metadata, exact GET, delete, and private anonymous denial', async () => {
    const storage = new InMemoryObjectStorage();
    const put = await storage.authorizeExactPut('assets/exact.txt', 'text/plain', checksum, 60);
    await expect(storage.uploadAuthorized(put, put.requiredHeaders, bytes)).resolves.toBeUndefined();
    await expect(storage.uploadAuthorized(put, put.requiredHeaders, bytes)).rejects.toThrow('Invalid or expired');
    await expect(storage.headExact('assets/exact.txt')).resolves.toEqual({ key: 'assets/exact.txt', contentType: 'text/plain', contentLength: bytes.byteLength, checksum });
    expect(storage.anonymousRead('assets/exact.txt')).toEqual({ status: 403 });
    const get = await storage.authorizeExactGet('assets/exact.txt', 60);
    await expect(storage.readAuthorized(get)).resolves.toEqual(bytes);
    await storage.deleteExact('assets/exact.txt');
    await expect(storage.headExact('assets/exact.txt')).resolves.toBeNull();
  });

  it('atomically claims each logical Redis item once and safely reclaims expired leases', async () => {
    const queue = new InMemoryRedisCoordination(); const now = new Date('2026-08-30T00:00:00.000Z');
    await queue.schedule('org:job', now);
    const [first, duplicate] = await Promise.all([queue.claimDue(now, 1, 10), queue.claimDue(now, 1, 10)]);
    expect([...first, ...duplicate]).toHaveLength(1);
    await expect(queue.claimDue(new Date(now.getTime() + 10_001), 1, 10)).resolves.toHaveLength(1);
  });
});

describe.skipIf(!hasR2)('optional live Cloudflare R2 Stage 4 contract', () => {
  it('round-trips checksum-bound private objects and denies unsigned reads', async () => {
    const adapter = new R2ObjectStorageAdapter({
      accountId: process.env.R2_ACCOUNT_ID!, bucketName: process.env.R2_BUCKET_NAME!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    });
    await expect(adapter.check()).resolves.toMatchObject({ service: 'cloudflare-r2', status: 'healthy' });
    const key = `assets/stage4-contract-${crypto.randomUUID()}.txt`;
    try {
      const put = await adapter.authorizeExactPut(key, 'text/plain', checksum, 60);
      const uploaded = await fetch(put.url, { method: 'PUT', headers: put.requiredHeaders, body: bytes });
      expect(uploaded.ok).toBe(true);
      await expect(adapter.headExact(key)).resolves.toMatchObject({ key, contentType: 'text/plain', contentLength: bytes.byteLength, checksum });
      const get = await adapter.authorizeExactGet(key, 60); const downloaded = await fetch(get.url, { headers: get.requiredHeaders });
      expect(downloaded.ok).toBe(true); expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(bytes);
      const anonymous = await fetch(`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`);
      expect([401, 403, 404]).toContain(anonymous.status);
    } finally { await adapter.deleteExact(key); }
  });
});

describe.skipIf(!hasUpstash)('optional live Upstash Redis Stage 4 contract', () => {
  it('schedules, atomically claims, acknowledges, and mirrors one namespaced logical ID', async () => {
    const namespace = `${process.env.REDIS_NAMESPACE}:contract:${crypto.randomUUID()}`;
    const adapter = new UpstashPublicationQueueAdapter({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN!, resourceId: process.env.UPSTASH_REDIS_RESOURCE_ID!, namespace });
    await expect(adapter.check()).resolves.toMatchObject({ service: 'upstash-redis', status: 'healthy' });
    const logicalId = `00000000-0000-4000-8000-000000000001:${crypto.randomUUID()}`;
    const now = new Date(); await adapter.schedule(logicalId, now);
    const claims = await adapter.claimDue(new Date(now.getTime() + 1), 1, 10);
    expect(claims).toHaveLength(1); expect(claims[0]?.logicalId).toBe(logicalId);
    await adapter.acknowledge(claims[0]!);
    await adapter.mirrorState('00000000-0000-4000-8000-000000000001', logicalId, 'queued', 60);
  });
});
