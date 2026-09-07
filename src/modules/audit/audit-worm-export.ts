import 'server-only';

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import type { ObjectStoragePort } from '@/integrations/storage/ports';

const MANIFEST_VERSION = 'worm-audit-export/1';

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const toJsonLines = (rows: readonly Record<string, unknown>[]): Uint8Array => {
  const text = rows
    .map((row) => JSON.stringify(row, (_key, value: unknown) => (value instanceof Date ? value.toISOString() : value)))
    .join('\n');
  return new TextEncoder().encode(text.length > 0 ? `${text}\n` : '');
};

interface WormExecutor {
  execute: PostgresJsDatabase<typeof schema>['execute'];
}

async function tableToJsonLines(
  db: WormExecutor,
  table: 'audit_logs' | 'runtime_config_audit_logs' | 'retention_runs',
  since: string,
  until: string,
): Promise<Uint8Array> {
  // Akses global lewat fungsi allowlist (RLS indicate_runtime tenant-only).
  const rows = await db.execute<{ readonly audit_worm_fetch: Record<string, unknown> }>(sql`
    SELECT indicate_private.audit_worm_fetch(${since}::timestamptz, ${until}::timestamptz, ${table}) AS audit_worm_fetch`);
  return toJsonLines(rows.map((row) => row.audit_worm_fetch));
}

export interface WormExportSummary {
  readonly date: string;
  readonly files: readonly { readonly key: string; readonly bytes: number; readonly sha256: string }[];
  readonly rows: number;
  readonly verified: boolean;
}

/** Ekspor harian jejak audit ke bucket WORM: tulis JSONL + manifes, verifikasi baca-balik, catat bukti.
 * Mengekspor HARI KEMARIN penuh (jendela tertutup sehingga isi stabil) dan idempoten:
 * berkas yang sudah ada dilewati (lock bucket melarang tulis ulang) setelah diverifikasi. */
export async function exportDailyAudit(input: {
  readonly db: WormExecutor;
  readonly storage: ObjectStoragePort;
  readonly now?: Date;
}): Promise<WormExportSummary> {
  const now = input.now ?? new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const day = since.toISOString().slice(0, 10);
  const sinceIso = since.toISOString();
  const untilIso = new Date(since.getTime() + 86_400_000).toISOString();

  const tables = ['audit_logs', 'runtime_config_audit_logs', 'retention_runs'] as const;
  const files: { readonly key: string; readonly bytes: Uint8Array; readonly sha256: string }[] = [];
  let rows = 0;
  for (const table of tables) {
    const bytes = await tableToJsonLines(input.db, table, sinceIso, untilIso);
    rows += bytes.length > 0 ? Buffer.from(bytes).toString('utf8').split('\n').length - 1 : 0;
    files.push({ key: `worm/${day}/${table}.jsonl`, bytes, sha256: sha256Hex(bytes) });
  }
  const manifest = {
    version: MANIFEST_VERSION,
    date: day,
    generatedAt: now.toISOString(),
    rows,
    files: files.map(({ key, bytes, sha256 }) => ({ key, bytes: bytes.length, sha256 })),
  };
  const manifestBytes = new TextEncoder().encode(`${JSON.stringify(manifest)}\n`);
  const manifestKey = `worm/${day}/manifest.json`;
  const uploads = [...files, { key: manifestKey, bytes: manifestBytes, sha256: sha256Hex(manifestBytes) }];
  for (const file of uploads) {
    const existing = await input.storage.headExact(file.key);
    if (existing !== null) continue;
    await input.storage.putExact(file.key, file.bytes, file.key.endsWith('.json') ? 'application/json' : 'application/x-ndjson');
  }
  for (const file of uploads) {
    const authorization = await input.storage.authorizeExactGet(file.key, 300);
    const response = await fetch(authorization.url);
    if (!response.ok) throw new Error(`WORM verify failed for ${file.key}.`);
    const digest = sha256Hex(new Uint8Array(await response.arrayBuffer()));
    if (digest !== file.sha256) throw new Error(`WORM checksum mismatch for ${file.key}.`);
  }
  const startedAt = now.toISOString();
  await input.db.execute(sql`
    SELECT indicate_private.worm_export_proof('audit_worm_export', ${rows}, ${startedAt}::timestamptz)`);
  return Object.freeze({
    date: day,
    files: uploads.map(({ key, bytes, sha256 }) => ({ key, bytes: bytes.length, sha256 })),
    rows,
    verified: true,
  });
}
