import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { withApiAccess } from '@/core/observability/api-access';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleStatusRepository } from '@/data/repos/status';
import {
  COMPONENT_LABELS,
  STATUS_COMPONENTS,
  overallHealth,
  type StatusComponent,
} from '@/modules/status/status-probe';

/** Hari uptime yang disajikan; selaras retensi agregat harian. */
const HISTORY_DAYS = 90;

async function handleGET() {
  const context = await getServerRuntimeContext();
  const repository = new DrizzleStatusRepository(getSharedRuntimeDatabase(context.bootstrap).db);
  const [latest, incidents, daily] = await Promise.all([
    repository.lastTwoPerComponent(),
    repository.recentIncidents(20),
    repository.dailySince(new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString().slice(0, 10)),
  ]);
  const newest = new Map<string, { readonly health: string; readonly latencyMs: number | null; readonly checkedAt: string }>();
  for (const row of latest) {
    const at = row.checkedAt instanceof Date ? row.checkedAt.toISOString() : String(row.checkedAt);
    const current = newest.get(row.component);
    if (current === undefined || current.checkedAt < at) {
      newest.set(row.component, { health: row.health, latencyMs: row.latencyMs, checkedAt: at });
    }
  }
  const components = STATUS_COMPONENTS.map((component: StatusComponent) => {
    const current = newest.get(component);
    return {
      component,
      label: COMPONENT_LABELS[component],
      health: current?.health ?? 'unknown',
      latencyMs: current?.latencyMs ?? null,
      checkedAt: current?.checkedAt ?? null,
      days: daily
        .filter((row) => row.component === component)
        .map((row) => ({ day: row.day, uptimePct: row.uptimePct })),
    };
  });
  return NextResponse.json(
    {
      status: overallHealth(
        components
          .filter((item) => item.health !== 'unknown')
          .map((item) => ({
            component: item.component,
            health: item.health as 'ok' | 'degraded' | 'down',
            latencyMs: item.latencyMs,
            detail: null,
            checkedAt: item.checkedAt ?? new Date(0).toISOString(),
          })),
      ),
      generatedAt: new Date().toISOString(),
      components,
      incidents: incidents.map((incident) => ({
        id: incident.id,
        component: incident.component,
        title: incident.title,
        status: incident.status,
        startedAt: incident.startedAt instanceof Date ? incident.startedAt.toISOString() : String(incident.startedAt),
        resolvedAt: incident.resolvedAt === null ? null : incident.resolvedAt instanceof Date ? incident.resolvedAt.toISOString() : String(incident.resolvedAt),
        updates: incident.updates,
      })),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
  );
}

/**
 * Status publik agregat untuk halaman status.
 *
 * @remarks Di-cache 60 detik di edge; probe mentah tetap di cron lima menitan.
 */
export const GET = withApiAccess('GET /api/status', handleGET);
