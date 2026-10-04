import 'server-only';

import { gunzipSync, gzipSync } from 'node:zlib';

/**
 * Minimal template-tag executor over the Neon table. Kept structural (not the
 * driver type) so unit tests inject a fake without a live connection.
 */
export interface NeonSnapshotExecutor {
  (strings: TemplateStringsArray, ...values: readonly unknown[]): Promise<readonly Record<string, unknown>[]>;
}

const GZIP_PREFIX = 'gzip:';

function encodeSnapshot(model: unknown): string {
  return `${GZIP_PREFIX}${gzipSync(Buffer.from(JSON.stringify(model), 'utf8')).toString('base64')}`;
}

function decodeSnapshot(raw: unknown): unknown | null {
  if (typeof raw === 'string') {
    if (!raw.startsWith(GZIP_PREFIX)) {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    }
    try {
      return JSON.parse(gunzipSync(Buffer.from(raw.slice(GZIP_PREFIX.length), 'base64')).toString('utf8')) as unknown;
    } catch {
      return null;
    }
  }
  if (raw !== null && typeof raw === 'object') return raw;
  return null;
}

/**
 * Third-layer runtime snapshot read-model in Neon (after in-process and Redis).
 * Keys include the revision so stale reads are impossible by construction.
 * Every failure returns null or resolves silently and the caller falls back —
 * never adopting a partial value.
 *
 * @remarks Same `gzip:` wire format as the Redis store so blobs stay
 * interchangeable. Neon has no key TTL: `touch` refreshes `updated_at` and
 * `write` deletes strictly older revisions of the same environment.
 */
export class NeonSnapshotStore {
  private readonly sql: NeonSnapshotExecutor;

  constructor(executor: NeonSnapshotExecutor) {
    this.sql = executor;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    try {
      const rows = await this.sql`SELECT blob FROM neon_runtime_snapshots WHERE environment = ${environment} AND revision = ${revision} LIMIT 1`;
      if (rows.length === 0) return null;
      return decodeSnapshot(rows[0]?.['blob']);
    } catch {
      return null;
    }
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    void ttlSeconds;
    try {
      await this.sql`INSERT INTO neon_runtime_snapshots (environment, revision, blob, updated_at) VALUES (${environment}, ${revision}, ${encodeSnapshot(model)}, now()) ON CONFLICT (environment, revision) DO UPDATE SET blob = EXCLUDED.blob, updated_at = now()`;
      await this.sql`DELETE FROM neon_runtime_snapshots WHERE environment = ${environment} AND revision < ${revision}`;
    } catch {
      /* best-effort: write failure does not fail the refresh */
    }
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    void ttlSeconds;
    try {
      await this.sql`UPDATE neon_runtime_snapshots SET updated_at = now() WHERE environment = ${environment} AND revision = ${revision}`;
    } catch {
      /* best-effort: an unrefreshed row simply ages out of attention */
    }
  }
}
