import type { HealthCheckPort } from '@/core/system/ports';

export interface StoredObjectMetadata {
  readonly key: string;
  readonly contentType: string;
  readonly contentLength: number;
  readonly checksum: string | null;
}

export interface ExactObjectAuthorization {
  readonly key: string;
  readonly url: string;
  readonly expiresAt: Date;
  /** Headers that are part of the signature and must be sent verbatim. */
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

export interface ObjectStoragePort extends HealthCheckPort {
  readonly bucketCount: 1;
  headExact(key: string): Promise<StoredObjectMetadata | null>;
  getExact(key: string): Promise<{ readonly contentType: string; readonly body: Uint8Array } | null>;
  authorizeExactPut(key: string, contentType: string, checksumSha256: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  authorizeExactGet(key: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  putExact(key: string, body: Uint8Array, contentType: string): Promise<{ readonly etag: string | null }>;
  deleteExact(key: string): Promise<void>;
}
