import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { and, eq, lt, sql } from 'drizzle-orm';

import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleStatusRepository } from '@/data/repos/status';
import { aiCredentials } from '@/data/schema/ai';
import { publishingJobs } from '@/data/schema/operations';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { authorized } from '@/app/api/internal/auth';
import {
  STATUS_COMPONENTS,
  evaluateIncidents,
  runProbes,
  summarizeUptime,
  type ComponentHealth,
  type ProbeResult,
  type StatusComponent,
} from '@/modules/status/status-probe';

/** Mentah hasil probe disimpan sekian hari; bilah 90 hari dari agregat. */
const RAW_RETENTION_DAYS = 30;

/** Antrean tertahan: queued lebih lama dari ini dianggap macet. */
const STUCK_MINUTES = 15;

function timed<T>(work: () => Promise<T>): () => Promise<number> {
  return async () => {
    const started = Date.now();
    await work();
    return Date.now() - started;
  };
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleStatusRepository(runtime.db);

  const history = await repository.lastTwoPerComponent();
  const byComponent = new Map<StatusComponent, ProbeResult[]>();
  for (const row of history) {
    if (!((STATUS_COMPONENTS as readonly string[]).includes(row.component))) continue;
    const list = byComponent.get(row.component as StatusComponent) ?? [];
    list.push({
      component: row.component as StatusComponent,
      health: row.health as ComponentHealth,
      latencyMs: row.latencyMs,
      detail: row.detail,
      checkedAt: row.checkedAt instanceof Date ? row.checkedAt.toISOString() : String(row.checkedAt),
    });
    byComponent.set(row.component as StatusComponent, list);
  }
  const previous = new Map<StatusComponent, ComponentHealth>();
  for (const [component, list] of byComponent) {
    list.sort((left, right) => (right.checkedAt < left.checkedAt ? -1 : 1));
    const prior = list[1] ?? list[0];
    if (prior !== undefined) previous.set(component, prior.health);
  }

  const storage = new R2ObjectStorageAdapter({
    accountId: context.config.r2.accountId,
    bucketName: context.config.r2.bucketName,
    publicBucketName: context.config.r2.publicBucketName,
    accessKeyId: context.config.r2.accessKeyId,
    secretAccessKey: context.config.r2.secretAccessKey,
  });
  const results = await runProbes({
    checkDatabase: timed(async () => {
      await runtime.db.execute(sql`SELECT 1`);
    }),
    checkRedis: timed(async () => {
      const redis = new Redis({ url: context.config.redis.url, token: context.config.redis.token });
      const pong = await redis.ping();
      if (pong !== 'PONG') throw new Error(`ping tak dikenal: ${String(pong).slice(0, 60)}`);
    }),
    checkStorage: timed(async () => {
      const state = await storage.check();
      if (state.status !== 'healthy') throw new Error(state.category);
    }),
    checkAuth: timed(async () => {
      const publicConfig = getPublicConfig(process.env);
      const response = await fetch(`${publicConfig.supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
        headers: { apikey: publicConfig.supabasePublishableKey },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`auth health ${response.status}`);
    }),
    checkDelivery: timed(async () => {
      const stuck = await runtime.db
        .select({ id: publishingJobs.id })
        .from(publishingJobs)
        .where(
          and(
            eq(publishingJobs.state, 'queued'),
            lt(publishingJobs.nextDispatchAt, new Date(Date.now() - STUCK_MINUTES * 60_000)),
          ),
        )
        .limit(21);
      if (stuck.length > 0) throw new Error(`${stuck.length} antrean tertahan`);
    }),
    checkAi: timed(async () => {
      const rows = await runtime.db
        .select({ id: aiCredentials.id })
        .from(aiCredentials)
        .where(eq(aiCredentials.status, 'active'))
        .limit(1);
      if (rows.length === 0) throw new Error('belum ada kredensial aktif');
    }),
    now: () => new Date(),
  });
  await repository.writeChecks(results.filter((result) => result.health !== 'unknown').map((result) => ({
    component: result.component,
    health: result.health,
    latencyMs: result.latencyMs,
    detail: result.detail,
    checkedAt: new Date(result.checkedAt),
  })));

  const open = await repository.openIncidents();
  const evaluation = evaluateIncidents(
    previous,
    results,
    open.map((incident) => ({ id: incident.id, component: incident.component as StatusComponent | null })),
  );
  const opened: string[] = [];
  for (const opening of evaluation.openings) {
    opened.push(await repository.openIncident({ ...opening, at: new Date() }));
  }
  for (const id of evaluation.resolveIds) {
    await repository.resolveIncident(id, new Date());
  }

  const today = new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${today}T00:00:00.000Z`);
  const todayChecks = await repository.checksSince(dayStart);
  const typedChecks = todayChecks.flatMap((check) => {
    if (!((STATUS_COMPONENTS as readonly string[]).includes(check.component))) return [];
    if (check.health !== 'ok' && check.health !== 'degraded' && check.health !== 'down') return [];
    return [{
      component: check.component as StatusComponent,
      health: check.health as ComponentHealth,
      latencyMs: check.latencyMs,
      checkedAt: check.checkedAt instanceof Date ? check.checkedAt.toISOString() : String(check.checkedAt),
    }];
  });
  const counts = new Map<string, number>();
  const latencySums = new Map<string, number>();
  const latencyCounts = new Map<string, number>();
  for (const check of typedChecks) {
    counts.set(check.component, (counts.get(check.component) ?? 0) + 1);
    if (check.latencyMs !== null && Number.isFinite(check.latencyMs)) {
      latencySums.set(check.component, (latencySums.get(check.component) ?? 0) + check.latencyMs);
      latencyCounts.set(check.component, (latencyCounts.get(check.component) ?? 0) + 1);
    }
  }
  await repository.upsertDaily(
    STATUS_COMPONENTS.flatMap((component) => {
      const checkCount = counts.get(component) ?? 0;
      // No probe data is not 100% uptime; omit this component/day instead.
      if (checkCount === 0) return [];
      const summary = summarizeUptime(typedChecks, component, 1, new Date())[0];
      const samples = latencyCounts.get(component) ?? 0;
      if (summary?.uptimePct == null) return [];
      return [{
        component,
        day: today,
        uptimePct: summary.uptimePct,
        checks: checkCount,
        avgLatencyMs: samples === 0 ? null : Math.round((latencySums.get(component) ?? 0) / samples),
      }];
    }),
  );
  const pruned = await repository.pruneChecks(new Date(Date.now() - RAW_RETENTION_DAYS * 86_400_000));

  return NextResponse.json(
    {
      requestId,
      checkedAt: new Date().toISOString(),
      results: results.map((result) => ({ component: result.component, health: result.health, latencyMs: result.latencyMs })),
      incidentsOpened: opened.length,
      incidentsResolved: evaluation.resolveIds.length,
      pruned,
    },
    { headers: noStore },
  );
}

/**
 * Putaran probe status tiga puluh menitan: tulis hasil, kelola insiden otomatis.
 *
 * @remarks Diotorisasi rahasia cron yang sama dengan perawatan lain; tanpa itu
 * 404 agar endpoint tak terpetakan.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/status-probe', handleGET);

export const maxDuration = 120;
