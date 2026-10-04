import 'server-only';

import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import type { ObjectStoragePort } from '@/integrations/storage/ports';

const MANIFEST_VERSION = 'worm-audit-export/1';

const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

const toJsonLines = (rows: readonly Record<string, unknown>[]): { readonly bytes: Uint8Array; readonly rows: number } => {
  const text = rows
    .map((row) =>
      JSON.stringify(row, (key, value: unknown) => {
        void key;
        return value instanceof Date ? value.toISOString() : value;
      }),
    )
    .join('\n');
  return { bytes: new TextEncoder().encode(text.length > 0 ? `${text}\n` : ''), rows: rows.length };
};

interface WormExecutor {
  execute: PostgresJsDatabase<typeof schema>['execute'];
}

async function tableToJsonLines(
  db: WormExecutor,
  table: 'audit_logs' | 'runtime_config_audit_logs' | 'retention_runs',
  since: string,
  until: string,
): Promise<{ readonly bytes: Uint8Array; readonly rows: number }> {
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

const EXPORT_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hari ekspor yang ditolak: format bukan kalender, atau jendela UTC-nya belum tertutup. */
export class WormExportDateError extends Error {
  constructor() {
    super('WORM export day is not a closed UTC day');
  }
}

/**
 * Resolusi jendela ekspor menjadi satu hari UTC yang isinya stabil.
 *
 * @param now - Waktu acuan; default `new Date()` di production.
 * @param day - Target `YYYY-MM-DD` UTC untuk backfill; null memakai HARI KEMARIN.
 * @returns Label hari, batas bawah inklusif, dan batas atas eksklusif jendela.
 * @throws {WormExportDateError} Bila `day` bukan tanggal kalender yang valid atau belum melewati hari ini UTC.
 */
export function resolveExportWindow(now: Date, day?: string | null): { readonly day: string; readonly sinceIso: string; readonly untilIso: string } {
  if (day === null || day === undefined || day === '') {
    const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    return { day: since.toISOString().slice(0, 10), sinceIso: since.toISOString(), untilIso: new Date(since.getTime() + 86_400_000).toISOString() };
  }
  const matched = EXPORT_DAY_PATTERN.exec(day);
  if (matched === null) throw new WormExportDateError();
  const since = new Date(Date.UTC(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3])));
  if (since.toISOString().slice(0, 10) !== day) throw new WormExportDateError();
  if (since.getTime() >= Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) throw new WormExportDateError();
  return { day, sinceIso: since.toISOString(), untilIso: new Date(since.getTime() + 86_400_000).toISOString() };
}

/** Ekspor harian jejak audit ke bucket WORM: tulis JSONL + manifes, verifikasi baca-balik, catat bukti.
 * Secara default mengekspor HARI KEMARIN penuh (jendela tertutup sehingga isi stabil) dan idempoten:
 * berkas yang sudah ada dilewati (lock bucket melarang tulis ulang) setelah diverifikasi.
 *
 * @param input - Database, penyimpanan, waktu acuan, dan hari target opsional untuk backfill.
 * @returns Ringkasan hari yang diekspor beserta jumlah baris dan status verifikasi.
 * @throws {WormExportDateError} Bila `day` bukan tanggal kalender yang valid atau belum melewati hari ini UTC.
 * @throws {Error} Bila verifikasi baca-balik gagal atau checksum objek tidak cocok.
 * @remarks Akses global lewat fungsi allowlist (RLS indicate_runtime tenant-only). Cakupan hari ada di
 * manifes R2, bukan di `retention_runs`: baris bukti memakai waktu jalan, sehingga beberapa backfill
 * satu hari berdekatan menghasilkan `started_at` yang berdekatan juga. */
export async function exportDailyAudit(input: {
  readonly db: WormExecutor;
  readonly storage: ObjectStoragePort;
  readonly now?: Date;
  readonly day?: string | null;
}): Promise<WormExportSummary> {
  const now = input.now ?? new Date();
  const window = resolveExportWindow(now, input.day);
  const day = window.day;
  const sinceIso = window.sinceIso;
  const untilIso = window.untilIso;

  const tables = ['audit_logs', 'runtime_config_audit_logs', 'retention_runs'] as const;
  const files: { readonly key: string; readonly bytes: Uint8Array; readonly sha256: string }[] = [];
  let rows = 0;
  for (const table of tables) {
    const { bytes, rows: tableRows } = await tableToJsonLines(input.db, table, sinceIso, untilIso);
    rows += tableRows;
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
