/**
 * Hasil pemeriksaan dan aturan insiden otomatis untuk halaman status.
 *
 * @remarks Semua keputusan insiden murni dan deterministik: tanpa input
 * dashboard, tanpa ambang tersembunyi. I/O (database, Redis, R2, Auth)
 * disuntik lewat `ProbeDeps` sehingga logika ini teruji tanpa jaringan.
 */
export const STATUS_COMPONENTS = [
  'database',
  'redis',
  'storage',
  'auth',
  'delivery',
  'ai',
  'api',
] as const;

export type StatusComponent = (typeof STATUS_COMPONENTS)[number];

export type ComponentHealth = 'ok' | 'degraded' | 'down';

export const COMPONENT_LABELS: Readonly<Record<StatusComponent, string>> = {
  database: 'Database',
  redis: 'Cache Redis',
  storage: 'Penyimpanan R2',
  auth: 'Autentikasi',
  delivery: 'Penerbitan',
  ai: 'Layanan AI',
  api: 'API',
};

export interface ProbeResult {
  readonly component: StatusComponent;
  readonly health: ComponentHealth;
  readonly latencyMs: number | null;
  readonly detail: string | null;
  readonly checkedAt: string;
}

export interface ProbeDeps {
  readonly checkDatabase: () => Promise<number>;
  readonly checkRedis: () => Promise<number>;
  readonly checkStorage: () => Promise<number>;
  readonly checkAuth: () => Promise<number>;
  readonly checkDelivery: () => Promise<number>;
  readonly checkAi: () => Promise<number>;
  readonly now: () => Date;
}

/** Batas lambat: di atas ini komponen dianggap menurun, bukan mati. */
export const SLOW_MS = 3000;

/** Batas waktu satu probe sebelum dinyatakan mati. */
export const PROBE_TIMEOUT_MS = 8000;

/** Gagal beruntun sebelum insiden dibuka otomatis. */
export const INCIDENT_THRESHOLD = 2;

async function runOne(
  component: StatusComponent,
  check: () => Promise<number>,
  now: Date,
  timeoutMs: number,
): Promise<ProbeResult> {
  const checkedAt = now.toISOString();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const latencyMs = await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('batas waktu terlampaui')), timeoutMs);
      }),
    ]);
    if (latencyMs >= SLOW_MS) {
      return { component, health: 'degraded', latencyMs, detail: 'respons lambat', checkedAt };
    }
    return { component, health: 'ok', latencyMs, detail: null, checkedAt };
  } catch (error) {
    const detail = error instanceof Error && error.message !== '' ? error.message.slice(0, 200) : 'pemeriksaan gagal';
    return { component, health: 'down', latencyMs: null, detail, checkedAt };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/**
 * Jalankan seluruh probe komponen dan kembalikan hasilnya.
 *
 * @param deps - Pemeriksa per komponen yang disuntik; `now` jam acuan.
 * @param timeoutMs - Batas waktu per probe; default `PROBE_TIMEOUT_MS`.
 * @returns Satu hasil per komponen sesuai urutan `STATUS_COMPONENTS`.
 * @remarks Konkuren: latensi total dibatasi probe terlambat, bukan jumlahnya.
 */
export async function runProbes(deps: ProbeDeps, timeoutMs = PROBE_TIMEOUT_MS): Promise<readonly ProbeResult[]> {
  const checks: Record<StatusComponent, () => Promise<number>> = {
    database: deps.checkDatabase,
    redis: deps.checkRedis,
    storage: deps.checkStorage,
    auth: deps.checkAuth,
    delivery: deps.checkDelivery,
    ai: deps.checkAi,
    api: async () => 0,
  };
  const now = deps.now();
  return Promise.all(STATUS_COMPONENTS.map((component) => runOne(component, checks[component], now, timeoutMs)));
}

export interface OpenIncidentInput {
  readonly id: string;
  readonly component: StatusComponent | null;
}

export interface IncidentOpening {
  readonly component: StatusComponent;
  readonly title: string;
  readonly detail: string | null;
}

export interface IncidentEvaluation {
  /** Insiden baru yang harus dibuka. */
  readonly openings: readonly IncidentOpening[];
  /** Id insiden terbuka yang harus ditutup. */
  readonly resolveIds: readonly string[];
}

/**
 * Tentukan insiden yang dibuka dan ditutup dari dua putaran terakhir.
 *
 * @param previous - Kesehatan putaran sebelumnya per komponen.
 * @param current - Hasil putaran ini per komponen.
 * @param open - Insiden yang masih terbuka.
 * @returns Bukaan baru (gagal `INCIDENT_THRESHOLD` kali beruntun tanpa insiden
 * terbuka) dan penutupan (komponen kembali ok).
 */
export function evaluateIncidents(
  previous: ReadonlyMap<StatusComponent, ComponentHealth>,
  current: readonly ProbeResult[],
  open: readonly OpenIncidentInput[],
): IncidentEvaluation {
  const openByComponent = new Map<StatusComponent, string>();
  for (const incident of open) {
    if (incident.component !== null && !openByComponent.has(incident.component)) {
      openByComponent.set(incident.component, incident.id);
    }
  }
  const openings: IncidentOpening[] = [];
  const resolveIds: string[] = [];
  for (const result of current) {
    const openId = openByComponent.get(result.component);
    if (result.health === 'ok') {
      if (openId !== undefined) resolveIds.push(openId);
      continue;
    }
    if (openId !== undefined) continue;
    if (previous.get(result.component) !== 'ok') {
      const label = COMPONENT_LABELS[result.component];
      openings.push({
        component: result.component,
        title: result.health === 'down' ? `${label} tidak merespons` : `${label} melambat`,
        detail: result.detail,
      });
    }
  }
  return { openings, resolveIds };
}

export interface DaySummary {
  /** Hari kalender UTC `YYYY-MM-DD`. */
  readonly day: string;
  /** Persen uptime 0–100; null bila tanpa data. */
  readonly uptimePct: number | null;
}

/**
 * Ringkas uptime harian per komponen dari hasil mentah.
 *
 * @param checks - Hasil pemeriksaan dengan cap waktu ISO.
 * @param component - Komponen yang diringkas.
 * @param days - Jumlah hari ke belakang termasuk hari ini.
 * @param now - Acuan waktu; default waktu berjalan.
 * @returns Satu ringkasan per hari, terurut menaik.
 * @remarks Bobot: ok 1, degraded 0.5, down 0.
 */
export function summarizeUptime(
  checks: readonly { readonly component: StatusComponent; readonly health: ComponentHealth; readonly checkedAt: string }[],
  component: StatusComponent,
  days: number,
  now = new Date(),
): readonly DaySummary[] {
  const byDay = new Map<string, { ok: number; half: number; total: number }>();
  for (const check of checks) {
    if (check.component !== component) continue;
    const time = new Date(check.checkedAt).getTime();
    if (Number.isNaN(time)) continue;
    const day = new Date(time).toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? { ok: 0, half: 0, total: 0 };
    bucket.total += 1;
    if (check.health === 'ok') bucket.ok += 1;
    else if (check.health === 'degraded') bucket.half += 1;
    byDay.set(day, bucket);
  }
  const summaries: DaySummary[] = [];
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let back = days - 1; back >= 0; back -= 1) {
    const day = new Date(base.getTime() - back * 86_400_000).toISOString().slice(0, 10);
    const bucket = byDay.get(day);
    summaries.push({
      day,
      uptimePct: bucket === undefined || bucket.total === 0 ? null : ((bucket.ok + bucket.half * 0.5) / bucket.total) * 100,
    });
  }
  return summaries;
}

/**
 * Status keseluruhan dari hasil terakhir.
 *
 * @param results - Hasil terakhir per komponen.
 * @returns `down` bila ada yang mati, `degraded` bila ada yang menurun.
 */
export function overallHealth(results: readonly ProbeResult[]): ComponentHealth {
  let worst: ComponentHealth = 'ok';
  for (const result of results) {
    if (result.health === 'down') return 'down';
    if (result.health === 'degraded') worst = 'degraded';
  }
  return worst;
}
