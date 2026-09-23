import { describe, expect, it, vi } from 'vitest';
import { S3Client } from '@aws-sdk/client-s3';

import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';

function clientStub() {
  const sent: { command: string; bucket: string; key: string | undefined }[] = [];
  const client = {
    send: vi.fn(async (command: { constructor: { name: string }; input: { Bucket?: string; Key?: string } }) => {
      sent.push({ command: command.constructor.name, bucket: command.input.Bucket ?? '', key: command.input.Key });
      if (command.constructor.name.includes('Head')) {
        const error = new Error('missing') as Error & { $metadata: { httpStatusCode: number } };
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      return {};
    }),
  };
  return { client, sent };
}

const BASE = {
  accountId: 'acct-1',
  bucketName: 'indicate-media',
  publicBucketName: 'indicate-media-public',
  accessKeyId: 'key-id',
  secretAccessKey: 'secret-key',
};

describe('R2ObjectStorageAdapter dual bucket', () => {
  it('mengarahkan baca dan hapus pub ke bucket publik', async () => {
    const { client, sent } = clientStub();
    const adapter = new R2ObjectStorageAdapter(BASE, client as unknown as S3Client);
    await expect(adapter.headExact('pub/o/org/p/article-cover/y=2026/f.webp')).resolves.toBe(null);
    await adapter.deleteExact('pub/o/org/p/article-cover/y=2026/f.webp');
    await expect(adapter.headExact('o/org/p/article-cover/y=2026/f.webp')).resolves.toBe(null);
    expect(sent.map((entry) => entry.bucket)).toEqual([
      'indicate-media-public',
      'indicate-media-public',
      'indicate-media',
    ]);
  });

  it('kembali ke bucket privat saat publik tak dikonfigurasi', async () => {
    const { client, sent } = clientStub();
    const adapter = new R2ObjectStorageAdapter({ ...BASE, publicBucketName: null }, client as unknown as S3Client);
    await expect(adapter.headExact('pub/o/org/p/article-cover/y=2026/f.webp')).resolves.toBe(null);
    expect(sent.map((entry) => entry.bucket)).toEqual(['indicate-media']);
  });

  it('menandatangani unggahan publik ke bucket publik dengan cache-control', async () => {
    const real = new S3Client({
      region: 'auto',
      endpoint: 'https://acct-1.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'key-id', secretAccessKey: 'secret-key' },
    });
    const adapter = new R2ObjectStorageAdapter(BASE, real);
    const authorization = await adapter.authorizeExactPut(
      'pub/o/org/p/article-cover/y=2026/foto-abcdef1234567890.webp',
      'image/webp',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      900,
    );
    expect(authorization.url).toContain('indicate-media-public');
    expect(authorization.requiredHeaders['cache-control']).toContain('max-age=31536000');
  });

  it('tidak menambah cache-control untuk unggahan privat', async () => {
    const real = new S3Client({
      region: 'auto',
      endpoint: 'https://acct-1.r2.cloudflarestorage.com',
      credentials: { accessKeyId: 'key-id', secretAccessKey: 'secret-key' },
    });
    const adapter = new R2ObjectStorageAdapter(BASE, real);
    const authorization = await adapter.authorizeExactPut(
      'o/org/p/site-logo/y=2026/logo-abcdef1234567890.png',
      'image/png',
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      900,
    );
    expect(authorization.url).toContain('indicate-media');
    expect(authorization.requiredHeaders).not.toHaveProperty('cache-control');
  });
});
