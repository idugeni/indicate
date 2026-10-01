import { index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** Hasil mentah satu putaran probe status; dibersihkan berkala oleh probe. */
export const statusChecks = pgTable('status_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  component: text('component').notNull(),
  health: text('health').notNull(),
  latencyMs: integer('latency_ms'),
  detail: text('detail'),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('status_checks_component_checked_idx').on(table.component, table.checkedAt),
]);

/** Agregat uptime harian per komponen untuk bilah 90 hari. */
export const statusDaily = pgTable('status_daily', {
  component: text('component').notNull(),
  day: text('day').notNull(),
  uptimePct: real('uptime_pct').notNull(),
  checks: integer('checks').default(0).notNull(),
  /** Rerata latensi harian (ms) untuk sparkline; null untuk hari lama tanpa data. */
  avgLatencyMs: integer('avg_latency_ms'),
  ...timestamps,
}, (table) => [
  primaryKey({ name: 'status_daily_pk', columns: [table.component, table.day] }),
]);

/** Insiden yang dibuka dan ditutup otomatis oleh evaluasi probe. */
export const statusIncidents = pgTable('status_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  component: text('component'),
  title: text('title').notNull(),
  detail: text('detail'),
  status: text('status').default('open').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  updates: jsonb('updates').$type<readonly { readonly at: string; readonly text: string }[]>().default([]).notNull(),
  ...timestamps,
}, (table) => [
  index('status_incidents_status_started_idx').on(table.status, table.startedAt),
]);
