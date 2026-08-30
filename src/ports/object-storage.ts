import type { HealthCheckPort } from '@/ports/health-check';

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
}

export interface ObjectStoragePort extends HealthCheckPort {
  readonly bucketCount: 1;
  headExact(key: string): Promise<StoredObjectMetadata | null>;
  authorizeExactPut(key: string, contentType: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  authorizeExactGet(key: string, expiresInSeconds: number): Promise<ExactObjectAuthorization>;
  deleteExact(key: string): Promise<void>;
}
