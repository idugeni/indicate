import { desc, eq, gte, lte, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import type * as schema from '@/data/schema';
import { statusChecks, statusDaily, statusIncidents } from '@/data/schema/status';

type Database = PostgresJsDatabase<typeof schema>;

const CHECK_READ_MAX_ROWS = 2000;
const INCIDENT_READ_MAX_ROWS = 50;
const DAILY_READ_MAX_ROWS = 700;

export interface StatusCheckInput {
  readonly component: string;
  readonly health: string;
  readonly latencyMs: number | null;
  readonly detail: string | null;
  readonly checkedAt: Date;
}

export interface StatusCheckRow extends StatusCheckInput {
  readonly id: string;
}

export interface StatusIncidentRow {
  readonly id: string;
  readonly component: string | null;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly startedAt: Date;
  readonly resolvedAt: Date | null;
  readonly updates: readonly { readonly at: string; readonly text: string }[];
}

export interface StatusDailyRow {
  readonly component: string;
  readonly day: string;
  readonly uptimePct: number;
  readonly checks: number;
  readonly avgLatencyMs: number | null;
}

/**
 * Persistensi telemetri halaman status: hasil probe, agregat harian, insiden.
 *
 * @remarks Semua baca berbatas dan terproyeksi; halaman status publik tidak
 * pernah memicu full-table dump.
 */
export class DrizzleStatusRepository {
  constructor(private readonly database: Database) {}

  /**
   * Simpan satu putaran hasil probe.
   *
   * @param rows - Hasil per komponen dari `runProbes`.
   */
  async writeChecks(rows: readonly StatusCheckInput[]): Promise<void> {
    if (rows.length === 0) return;
    await this.database.insert(statusChecks).values(rows.map((row) => ({
      component: row.component,
      health: row.health,
      latencyMs: row.latencyMs,
      detail: row.detail === null ? null : row.detail.slice(0, 200),
      checkedAt: row.checkedAt,
    })));
  }

  /**
   * Dua hasil terakhir per komponen untuk evaluasi insiden.
   *
   * @returns Per komponen maksimal dua baris terbaru.
   */
  async lastTwoPerComponent(): Promise<readonly StatusCheckRow[]> {
    const ranked = await this.database.execute<{ readonly id: string; readonly component: string; readonly health: string; readonly latency_ms: number | null; readonly detail: string | null; readonly checked_at: Date }>(sql`
      SELECT id, component, health, latency_ms, detail, checked_at FROM (
        SELECT id, component, health, latency_ms, detail, checked_at,
          row_number() OVER (PARTITION BY component ORDER BY checked_at DESC) AS rn
        FROM ${statusChecks}
      ) AS ranked WHERE rn <= 2
    `);
    return ranked
      .slice(0, CHECK_READ_MAX_ROWS)
      .map((row) => ({
        id: row.id,
        component: row.component,
        health: row.health,
        latencyMs: row.latency_ms,
        detail: row.detail,
        checkedAt: row.checked_at,
      }));
  }

  /**
   * Hasil mentah dalam rentang untuk agregat harian.
   *
   * @param since - Batas bawah `checked_at`.
   * @returns Maksimal `CHECK_READ_MAX_ROWS` baris terproyeksi.
   */
  async checksSince(since: Date): Promise<readonly { readonly component: string; readonly health: string; readonly latencyMs: number | null; readonly checkedAt: Date }[]> {
    const rows = await this.database
      .select({ component: statusChecks.component, health: statusChecks.health, latencyMs: statusChecks.latencyMs, checkedAt: statusChecks.checkedAt })
      .from(statusChecks)
      .where(gte(statusChecks.checkedAt, since))
      .orderBy(statusChecks.checkedAt)
      .limit(CHECK_READ_MAX_ROWS);
    return rows;
  }

  /**
   * Insiden yang masih terbuka.
   *
   * @returns Maksimal `INCIDENT_READ_MAX_ROWS` baris.
   */
  async openIncidents(): Promise<readonly StatusIncidentRow[]> {
    const rows = await this.database
      .select()
      .from(statusIncidents)
      .where(eq(statusIncidents.status, 'open'))
      .orderBy(desc(statusIncidents.startedAt))
      .limit(INCIDENT_READ_MAX_ROWS);
    return rows.map(toIncidentRow);
  }

  /**
   * Insiden terbaru untuk halaman status.
   *
   * @param limit - Batas baris; maksimal `INCIDENT_READ_MAX_ROWS`.
   * @returns Terbuka dulu, lalu yang selesai terbaru.
   */
  async recentIncidents(limit: number): Promise<readonly StatusIncidentRow[]> {
    const rows = await this.database
      .select()
      .from(statusIncidents)
      .orderBy(desc(statusIncidents.startedAt))
      .limit(Math.min(Math.max(limit, 1), INCIDENT_READ_MAX_ROWS));
    return rows.map(toIncidentRow);
  }

  /**
   * Buka insiden baru.
   *
   * @param input - Komponen, judul, dan detail awal.
   * @returns Id insiden.
   */
  async openIncident(input: { readonly component: string; readonly title: string; readonly detail: string | null; readonly at: Date }): Promise<string> {
    const rows = await this.database
      .insert(statusIncidents)
      .values({
        component: input.component,
        title: input.title,
        detail: input.detail,
        status: 'open',
        startedAt: input.at,
        updates: [{ at: input.at.toISOString(), text: `Investigasi dimulai: ${input.title}.` }],
      })
      .returning({ id: statusIncidents.id });
    const id = rows[0]?.id;
    if (id === undefined) throw new Error('status incident insert returned no id');
    return id;
  }

  /**
   * Tutup insiden terbuka.
   *
   * @param id - Id insiden.
   * @param at - Waktu penyelesaian.
   */
  async resolveIncident(id: string, at: Date): Promise<void> {
    const current = await this.database
      .select({ updates: statusIncidents.updates, title: statusIncidents.title })
      .from(statusIncidents)
      .where(eq(statusIncidents.id, id))
      .limit(1);
    const row = current[0];
    const updates = [...(row?.updates ?? []), { at: at.toISOString(), text: `Teratasi: ${row?.title ?? 'insiden'}.` }];
    await this.database
      .update(statusIncidents)
      .set({ status: 'resolved', resolvedAt: at, updates, updatedAt: at })
      .where(eq(statusIncidents.id, id));
  }

  /**
   * Tulis agregat harian per komponen.
   *
   * @param rows - Satu baris per komponen per hari.
   */
  async upsertDaily(rows: readonly StatusDailyRow[]): Promise<void> {
    if (rows.length === 0) return;
    for (const row of rows) {
      await this.database
        .insert(statusDaily)
        .values({ component: row.component, day: row.day, uptimePct: row.uptimePct, checks: row.checks, avgLatencyMs: row.avgLatencyMs })
        .onConflictDoUpdate({
          target: [statusDaily.component, statusDaily.day],
          set: { uptimePct: row.uptimePct, checks: row.checks, avgLatencyMs: row.avgLatencyMs, updatedAt: new Date() },
        });
    }
  }

  /**
   * Agregat harian sejak tanggal tertentu.
   *
   * @param sinceDay - Hari `YYYY-MM-DD` batas bawah.
   * @returns Maksimal `DAILY_READ_MAX_ROWS` baris.
   */
  async dailySince(sinceDay: string): Promise<readonly StatusDailyRow[]> {
    const rows = await this.database
      .select({ component: statusDaily.component, day: statusDaily.day, uptimePct: statusDaily.uptimePct, checks: statusDaily.checks, avgLatencyMs: statusDaily.avgLatencyMs })
      .from(statusDaily)
      .where(gte(statusDaily.day, sinceDay))
      .orderBy(statusDaily.day)
      .limit(DAILY_READ_MAX_ROWS);
    return rows;
  }

  /**
   * Hapus hasil mentah lebih tua dari batas retensi.
   *
   * @param before - Hapus baris dengan `checked_at` sebelum ini.
   * @returns Jumlah baris terhapus.
   */
  async pruneChecks(before: Date): Promise<number> {
    const removed = await this.database
      .delete(statusChecks)
      .where(lte(statusChecks.checkedAt, before))
      .returning({ id: statusChecks.id });
    return removed.length;
  }
}

function toIncidentRow(row: {
  readonly id: string;
  readonly component: string | null;
  readonly title: string;
  readonly detail: string | null;
  readonly status: string;
  readonly startedAt: Date;
  readonly resolvedAt: Date | null;
  readonly updates: readonly { readonly at: string; readonly text: string }[];
}): StatusIncidentRow {
  return {
    id: row.id,
    component: row.component,
    title: row.title,
    detail: row.detail,
    status: row.status,
    startedAt: row.startedAt,
    resolvedAt: row.resolvedAt,
    updates: row.updates,
  };
}
