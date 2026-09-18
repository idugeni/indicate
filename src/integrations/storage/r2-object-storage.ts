import 'server-only';

import { createHash } from 'node:crypto';

import { DeleteObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { ExactObjectAuthorization, ObjectStoragePort, StoredObjectMetadata } from '@/integrations/storage/ports';

export interface R2ObjectStorageConfig {
  readonly accountId: string;
  readonly bucketName: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly now?: () => Date;
}

export class R2ObjectStorageAdapter implements ObjectStoragePort {
  readonly bucketCount = 1 as const;
  private readonly client: S3Client;
  private readonly now: () => Date;

  constructor(private readonly config: R2ObjectStorageConfig, client?: S3Client) {
    this.now = config.now ?? (() => new Date());
    this.client = client ?? new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  async check() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucketName }));
      return { service: 'cloudflare-r2', status: 'healthy' as const, category: 'r2_bucket_ready' };
    } catch {
      return { service: 'cloudflare-r2', status: 'unhealthy' as const, category: 'r2_bucket_unavailable' };
    }
  }

  async headExact(key: string): Promise<StoredObjectMetadata | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucketName, Key: key }));
      return Object.freeze({
        key,
        contentType: result.ContentType ?? 'application/octet-stream',
        contentLength: result.ContentLength ?? 0,
        checksum: result.ChecksumSHA256 ?? null,
      });
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async getExact(key: string): Promise<{ readonly contentType: string; readonly body: Uint8Array } | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }));
      const chunks: Uint8Array[] = [];
      const body = result.Body as AsyncIterable<Uint8Array> | undefined;
      if (body === undefined) return null;
      for await (const chunk of body) chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk);
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      return Object.freeze({ contentType: result.ContentType ?? 'application/octet-stream', body: merged });
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
      if (status === 404) return null;
      throw error;
    }
  }

  async authorizeExactPut(key: string, contentType: string, checksumSha256: string, expiresInSeconds: number): Promise<ExactObjectAuthorization> {
    const requiredHeaders = Object.freeze({ 'content-type': contentType, 'x-amz-checksum-sha256': checksumSha256 });
    const url = await getSignedUrl(this.client, new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      ContentType: contentType,
      ChecksumSHA256: checksumSha256,
    }), { expiresIn: expiresInSeconds, unhoistableHeaders: new Set(['x-amz-checksum-sha256']) });
    return Object.freeze({ key, url, requiredHeaders, expiresAt: new Date(this.now().getTime() + expiresInSeconds * 1_000) });
  }

  async authorizeExactGet(key: string, expiresInSeconds: number): Promise<ExactObjectAuthorization> {
    const url = await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucketName, Key: key }), { expiresIn: expiresInSeconds });
    return Object.freeze({ key, url, requiredHeaders: Object.freeze({}), expiresAt: new Date(this.now().getTime() + expiresInSeconds * 1_000) });
  }

  async putExact(key: string, body: Uint8Array, contentType: string): Promise<{ readonly etag: string | null }> {
    const checksum = createHash('sha256').update(body).digest('base64');
    const result = await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      ChecksumSHA256: checksum,
    }));
    return Object.freeze({ etag: result.ETag ?? null });
  }

  async deleteExact(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucketName, Key: key }));
  }
}
