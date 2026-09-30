import { describe, expect, it } from 'vitest';

import {
  COMPONENT_LABELS,
  STATUS_COMPONENTS,
  evaluateIncidents,
  overallHealth,
  runProbes,
  summarizeUptime,
  withLoadTimeout,
  type ComponentHealth,
  type ProbeDeps,
  type StatusComponent,
} from '@/modules/status/status-probe';

function deps(overrides: Record<string, () => Promise<number>> = {}): ProbeDeps {
  const ok = async () => 120;
  return {
    checkDatabase: ok,
    checkRedis: ok,
    checkStorage: ok,
    checkAuth: ok,
    checkDelivery: ok,
    checkAi: ok,
    now: () => new Date('2026-09-30T10:00:00.000Z'),
    ...overrides,
  };
}

describe('runProbes', () => {
  it('melaporkan ok untuk semua komponen yang cepat', async () => {
    const results = await runProbes(deps());
    expect(results.map((result) => result.component)).toEqual([...STATUS_COMPONENTS]);
    expect(results.every((result) => result.health === 'ok')).toBe(true);
    expect(results.every((result) => result.component === 'api' ? result.latencyMs === 0 : result.latencyMs === 120)).toBe(true);
  });

  it('menandai lambat sebagai degraded dan gagal sebagai down', async () => {
    const results = await runProbes(deps({
      checkRedis: async () => 4500,
      checkStorage: async () => {
        throw new Error('jaringan putus');
      },
    }), 50);
    const byComponent = new Map(results.map((result) => [result.component, result] as const));
    expect(byComponent.get('redis')).toMatchObject({ health: 'degraded', latencyMs: 4500 });
    expect(byComponent.get('storage')).toMatchObject({ health: 'down', latencyMs: null });
    expect(byComponent.get('database')).toMatchObject({ health: 'ok' });
  });

  it('menyatakan down saat melewati batas waktu', async () => {
    const results = await runProbes(deps({
      checkAuth: () => new Promise<number>(() => undefined),
    }), 5);
    expect(results.find((result) => result.component === 'auth')).toMatchObject({
      health: 'down',
      detail: 'batas waktu terlampaui',
    });
  });
});

describe('evaluateIncidents', () => {
  const down = (component: StatusComponent): { readonly component: StatusComponent; readonly health: ComponentHealth; readonly latencyMs: null; readonly detail: string | null; readonly checkedAt: string } => ({
    component,
    health: 'down',
    latencyMs: null,
    detail: null,
    checkedAt: '2026-09-30T10:05:00.000Z',
  });

  it('membuka insiden setelah dua kali gagal beruntun', () => {
    const evaluation = evaluateIncidents(new Map([['database', 'down']]), [down('database')], []);
    expect(evaluation.openings).toEqual([{ component: 'database', title: 'Database tidak merespons', detail: null }]);
    expect(evaluation.resolveIds).toEqual([]);
  });

  it('tidak membuka pada kegagalan pertama dan tidak menduplikasi yang terbuka', () => {
    const first = evaluateIncidents(new Map([['redis', 'ok']]), [down('redis')], []);
    expect(first.openings).toEqual([]);
    const duplicate = evaluateIncidents(
      new Map([['redis', 'down']]),
      [down('redis')],
      [{ id: 'inc-1', component: 'redis' }],
    );
    expect(duplicate.openings).toEqual([]);
    expect(duplicate.resolveIds).toEqual([]);
  });

  it('menutup insiden saat komponen pulih', () => {
    const evaluation = evaluateIncidents(
      new Map<StatusComponent, ComponentHealth>([['auth', 'down']]),
      [{ component: 'auth', health: 'ok', latencyMs: 80, detail: null, checkedAt: '2026-09-30T10:05:00.000Z' }],
      [{ id: 'inc-9', component: 'auth' }],
    );
    expect(evaluation.openings).toEqual([]);
    expect(evaluation.resolveIds).toEqual(['inc-9']);
  });

  it('memberi label Indonesia untuk tiap komponen', () => {
    for (const component of STATUS_COMPONENTS) {
      expect(COMPONENT_LABELS[component].length).toBeGreaterThan(0);
    }
  });
});

describe('summarizeUptime', () => {
  it('menghitung bobot ok, degraded, dan down per hari', () => {
    const checks = [
      { component: 'api' as const, health: 'ok' as const, checkedAt: '2026-09-30T01:00:00.000Z' },
      { component: 'api' as const, health: 'ok' as const, checkedAt: '2026-09-30T02:00:00.000Z' },
      { component: 'api' as const, health: 'degraded' as const, checkedAt: '2026-09-30T03:00:00.000Z' },
      { component: 'api' as const, health: 'down' as const, checkedAt: '2026-09-30T04:00:00.000Z' },
    ];
    const summaries = summarizeUptime(checks, 'api', 1, new Date('2026-09-30T12:00:00.000Z'));
    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.day).toBe('2026-09-30');
    expect(summaries[0]?.uptimePct).toBeCloseTo(62.5, 5);
  });

  it('mengembalikan null untuk hari tanpa data', () => {
    const summaries = summarizeUptime([], 'database', 3, new Date('2026-09-30T12:00:00.000Z'));
    expect(summaries.map((summary) => summary.day)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30']);
    expect(summaries.every((summary) => summary.uptimePct === null)).toBe(true);
  });
});

describe('withLoadTimeout', () => {
  it('mengembalikan hasil saat selesai sebelum batas', async () => {
    await expect(withLoadTimeout(Promise.resolve('siap'), 50)).resolves.toBe('siap');
  });

  it('mengembalikan null saat melewati batas', async () => {
    await expect(withLoadTimeout(new Promise(() => undefined), 5)).resolves.toBeNull();
  });
});

describe('overallHealth', () => {
  it('mengambil status terburuk', () => {
    const base = { latencyMs: 100, detail: null, checkedAt: '2026-09-30T10:00:00.000Z' } as const;
    expect(overallHealth([{ ...base, component: 'api', health: 'ok' }])).toBe('ok');
    expect(overallHealth([
      { ...base, component: 'api', health: 'ok' },
      { ...base, component: 'redis', health: 'degraded' },
    ])).toBe('degraded');
    expect(overallHealth([
      { ...base, component: 'redis', health: 'degraded' },
      { ...base, component: 'database', health: 'down' },
    ])).toBe('down');
  });
});
