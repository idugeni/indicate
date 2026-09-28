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

export interface StoredObjectRef {
  readonly bucket: string;
  readonly key: string;
  readonly contentLength: number;
  /** Provider ETag, quoted-form stripped. */
  readonly etag: string | null;
  /** Bucket role the key prefix routed this object into. */
  readonly visibility: 'private' | 'public';
}

export interface ObjectStoragePort extends HealthCheckPort {
  readonly bucketCount: 1;
  headExact(key: string): Promise<StoredObjectMetadata | null>;
  getExact(key: string): Promise<{ readonly contentType: string; readonly body: Uint8Array } | null>;
  authorizeExactPut(key: string, contentType: string, checksumSha256: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  authorizeExactGet(key: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  putExact(key: string, body: Uint8Array, contentType: string): Promise<{ readonly etag: string | null }>;
  deleteExact(key: string): Promise<void>;
  /**
   * Enumerate stored objects across every configured bucket for reconciliation.
   *
   * @remarks Returns key and size metadata only, never object bytes. Reserved for
   * system reconciliation; a tenant-scoped read path must use `authorizeExactGet`.
   */
  listObjects(): Promise<readonly StoredObjectRef[]>;
}
